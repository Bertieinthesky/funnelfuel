import { toJson } from "@/lib/json";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stitchFromPayment } from "@/lib/identity/stitch";
import { EventSource, EventType } from "@prisma/client";
import { createHmac } from "crypto";

function verifyWhopSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${expected}` === signature;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("x-whop-signature") ?? "";
  const secret = process.env.WHOP_WEBHOOK_SECRET ?? "";

  if (secret && !verifyWhopSignature(body, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event as string;

  try {
    if (eventType === "payment.succeeded" || eventType === "membership.went_valid") {
      await handleWhopPayment(event);
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/whop] Error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleWhopPayment(event: Record<string, unknown>) {
  const data = (event.data ?? event) as Record<string, unknown>;
  const user = data.user as Record<string, unknown> | undefined;
  const email = (user?.email ?? data.email) as string | undefined;
  const organizationId = (data.metadata as Record<string, unknown>)
    ?.organizationId as string | undefined;

  if (!email || !organizationId) return;

  const { contactId } = await stitchFromPayment(organizationId, email, {
    firstName: user?.name
      ? String(user.name).split(" ")[0]
      : undefined,
    lastName: user?.name
      ? String(user.name).split(" ").slice(1).join(" ")
      : undefined,
  });

  const amountCents = Math.round(
    ((data.total ?? data.amount ?? 0) as number) * 100
  );
  const externalId = (data.id ?? event.id) as string;

  await db.payment.upsert({
    where: { externalId },
    create: {
      contactId,
      organizationId,
      amountCents,
      currency: (data.currency as string) ?? "usd",
      processor: "whop",
      externalId,
      status: "succeeded",
    },
    update: { status: "succeeded" },
  });

  await db.event.create({
    data: {
      organizationId,
      contactId,
      type: EventType.PURCHASE,
      source: EventSource.WHOP_WEBHOOK,
      confidence: 100,
      externalId: String(event.id ?? externalId),
      data: toJson({ amountCents, email }),
    },
  }).catch(() => {});
}
