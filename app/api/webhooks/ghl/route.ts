// GoHighLevel Webhook Handler
// Handles form submissions (opt-ins) and appointment bookings.
// orgId must be passed as ?orgId=xxx on the webhook URL.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stitchIdentity } from "@/lib/identity/stitch";
import { toJson } from "@/lib/json";
import { deterministicId } from "@/lib/idempotency";
import { sanitizeContact } from "@/lib/schemas/webhooks";
import { EventSource, EventType } from "@prisma/client";
import { createHmac } from "crypto";

function verifyGhlSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("x-ghl-signature") ?? "";
  const secret = process.env.GHL_WEBHOOK_SECRET ?? "";

  if (secret && sig && !verifyGhlSignature(body, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = new URL(req.url);
  const organizationId =
    url.searchParams.get("orgId") ??
    (payload.customFields as Record<string, string>)?.organizationId;

  if (!organizationId) {
    return NextResponse.json({ error: "No organizationId" }, { status: 400 });
  }

  const eventType = (payload.type ?? payload.event_type ?? "") as string;

  try {
    if (
      eventType.includes("form") ||
      eventType.includes("opt") ||
      eventType === "ContactCreate" ||
      eventType === "contact.create"
    ) {
      await handleFormSubmission(payload, organizationId);
    } else if (
      eventType.includes("appointment") ||
      eventType.includes("booking") ||
      eventType === "AppointmentCreate" ||
      eventType === "appointment.create"
    ) {
      await handleAppointmentBooked(payload, organizationId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/ghl] Error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleFormSubmission(
  payload: Record<string, unknown>,
  organizationId: string
) {
  const raw = (payload.contact ?? payload) as Record<string, unknown>;
  const contact = sanitizeContact({
    email: raw.email ?? payload.email,
    phone: raw.phone ?? payload.phone,
    firstName: raw.firstName ?? raw.first_name,
    lastName: raw.lastName ?? raw.last_name,
  });
  if (!contact.email && !contact.phone) return;

  const { contactId } = await stitchIdentity(
    organizationId,
    "ghl-" + String((raw as Record<string, unknown>).id ?? contact.email),
    contact
  );

  // Deterministic ID: same GHL contact + same event type = same ID (idempotent)
  const externalId = String(payload.id) !== "undefined"
    ? `ghl-${String(payload.id)}`
    : deterministicId("ghl", "optin", contact.email, organizationId);

  await db.event.create({
    data: {
      organizationId,
      contactId,
      type: EventType.OPT_IN,
      source: EventSource.GHL_WEBHOOK,
      confidence: 90,
      externalId,
      data: toJson({ email: contact.email, source: "ghl_form" }),
    },
  }).catch(() => {});
}

async function handleAppointmentBooked(
  payload: Record<string, unknown>,
  organizationId: string
) {
  const raw = (payload.contact ?? payload) as Record<string, unknown>;
  const contact = sanitizeContact({
    email: raw.email ?? payload.email,
    phone: raw.phone ?? payload.phone,
    firstName: raw.firstName ?? raw.first_name,
    lastName: raw.lastName ?? raw.last_name,
  });
  if (!contact.email && !contact.phone) return;

  const { contactId } = await stitchIdentity(
    organizationId,
    "ghl-appt-" + String(payload.id ?? contact.email),
    contact
  );

  const externalId = String(payload.id) !== "undefined"
    ? `ghl-appt-${String(payload.id)}`
    : deterministicId("ghl", "booking", contact.email, organizationId);

  await db.event.create({
    data: {
      organizationId,
      contactId,
      type: EventType.BOOKING,
      source: EventSource.GHL_WEBHOOK,
      confidence: 95,
      externalId,
      data: toJson({
        email: contact.email,
        appointmentId: payload.id,
        startTime: payload.startTime ?? payload.start_time,
        calendarId: payload.calendarId ?? payload.calendar_id,
      }),
    },
  }).catch(() => {});
}
