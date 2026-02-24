// Calendly Webhook Handler
// Handles invitee.created (booking) and invitee.canceled events.
// orgId must be passed as ?orgId=xxx on the webhook URL.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stitchIdentity } from "@/lib/identity/stitch";
import { toJson } from "@/lib/json";
import { deterministicId } from "@/lib/idempotency";
import { sanitizeContact } from "@/lib/schemas/webhooks";
import { EventSource, EventType } from "@prisma/client";
import { createHmac } from "crypto";

function verifyCalendlySignature(body: string, signature: string, secret: string): boolean {
  const parts = Object.fromEntries(
    signature.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return expected === v1;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sigHeader = req.headers.get("x-calendly-webhook-subscription") ?? "";
  const secret = process.env.CALENDLY_WEBHOOK_SECRET ?? "";

  if (secret && sigHeader) {
    if (!verifyCalendlySignature(body, sigHeader, secret)) {
      console.warn("[webhook/calendly] Signature mismatch");
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = new URL(req.url);
  const organizationId = url.searchParams.get("orgId");
  if (!organizationId) {
    return NextResponse.json({ error: "No organizationId" }, { status: 400 });
  }

  const eventType = payload.event as string;
  const eventData = payload.payload as Record<string, unknown>;

  try {
    if (eventType === "invitee.created") {
      // Use Calendly's event URI as the stable ID; fall back to deterministic hash
      const uri = (eventData?.uri ?? payload.uri) as string | undefined;
      const externalId = uri
        ? `calendly-${uri.split("/").pop()}`
        : deterministicId("calendly", "booking", (eventData?.email as string), organizationId);

      await handleBookingCreated(eventData, organizationId, externalId);
    } else if (eventType === "invitee.canceled") {
      await handleBookingCanceled(eventData, organizationId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/calendly] Error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleBookingCreated(
  data: Record<string, unknown>,
  organizationId: string,
  externalId: string
) {
  const contact = sanitizeContact({
    email: data.email,
    firstName: ((data.name as string) ?? "").split(" ")[0],
    lastName: ((data.name as string) ?? "").split(" ").slice(1).join(" "),
  });
  if (!contact.email) return;

  const { contactId } = await stitchIdentity(
    organizationId,
    "calendly-" + contact.email,
    contact
  );

  await db.event.create({
    data: {
      organizationId,
      contactId,
      type: EventType.BOOKING,
      source: EventSource.CALENDLY_WEBHOOK,
      confidence: 95,
      externalId,
      data: toJson({
        email: contact.email,
        scheduledAt: data.scheduled_event,
        timezone: data.timezone,
        questionsAndAnswers: data.questions_and_answers,
      }),
    },
  }).catch(() => {});
}

async function handleBookingCanceled(
  data: Record<string, unknown>,
  organizationId: string
) {
  const email = sanitizeContact({ email: data.email }).email;
  if (!email) return;

  await db.event.updateMany({
    where: {
      organizationId,
      type: EventType.BOOKING,
      source: EventSource.CALENDLY_WEBHOOK,
      data: { path: ["email"], equals: email },
    },
    data: { data: toJson({ email, canceled: true, canceledAt: new Date().toISOString() }) },
  }).catch(() => {});
}
