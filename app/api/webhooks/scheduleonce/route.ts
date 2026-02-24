// ScheduleOnce (OnceHub) Webhook Handler
// Handles booking.scheduled, booking.canceled, booking.rescheduled events.
// Setup: OnceHub → Account → Webhooks → https://app.funnelfuel.ai/api/webhooks/scheduleonce?orgId=ORG_ID

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toJson } from "@/lib/json";
import { deterministicId } from "@/lib/idempotency";
import { sanitizeContact } from "@/lib/schemas/webhooks";
import { stitchIdentity } from "@/lib/identity/stitch";
import { EventSource, EventType } from "@prisma/client";

export async function POST(req: NextRequest) {
  // ScheduleOnce can send an API key in the header for verification
  const apiKey = req.headers.get("x-api-key") ?? req.headers.get("authorization") ?? "";
  const expectedKey = process.env.SCHEDULEONCE_WEBHOOK_SECRET ?? "";

  if (expectedKey && apiKey !== expectedKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = new URL(req.url);
  const organizationId = url.searchParams.get("orgId");
  if (!organizationId) {
    return NextResponse.json({ error: "No organizationId" }, { status: 400 });
  }

  const eventType = (payload.event_type ?? payload.type ?? payload.status) as string;
  const booking = (payload.booking ?? payload.data ?? payload) as Record<string, unknown>;

  if (
    eventType === "booking.scheduled" ||
    eventType === "BOOKED" ||
    eventType === "scheduled"
  ) {
    try {
      await handleBookingScheduled(booking, organizationId, payload.id ? String(payload.id) : deterministicId("scheduleonce", "booking", (booking.email as string), organizationId));
      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("[webhook/scheduleonce] Error:", err);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  } else if (
    eventType === "booking.canceled" ||
    eventType === "CANCELED" ||
    eventType === "canceled"
  ) {
    await handleBookingCanceled(booking, organizationId);
    return NextResponse.json({ received: true });
  } else if (
    eventType === "booking.rescheduled" ||
    eventType === "RESCHEDULED" ||
    eventType === "rescheduled"
  ) {
    try {
      await handleBookingScheduled(booking, organizationId, payload.id ? String(payload.id) : deterministicId("scheduleonce", "booking", (booking.email as string), organizationId));
      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("[webhook/scheduleonce] Error:", err);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function handleBookingScheduled(
  booking: Record<string, unknown>,
  organizationId: string,
  externalId: string
) {
  const booker = (booking.booker ?? booking.invitee ?? booking.customer ?? booking) as Record<string, unknown>;
  const email = (booker.email ?? booking.email) as string | undefined;
  if (!email) return;

  const name = (booker.name ?? booker.full_name ?? booking.name ?? "") as string;
  const nameParts = name.split(" ");

  const { contactId } = await stitchIdentity(
    organizationId,
    "scheduleonce-" + externalId,
    {
      email,
      phone: (booker.phone ?? booking.phone) as string | undefined,
      firstName: (booker.first_name ?? nameParts[0]) as string | undefined,
      lastName: (booker.last_name ?? nameParts.slice(1).join(" ")) as string | undefined,
    }
  );

  await db.event.create({
    data: {
      organizationId,
      contactId,
      type: EventType.BOOKING,
      source: EventSource.SCHEDULEONCE_WEBHOOK,
      confidence: 95,
      externalId: `scheduleonce-${externalId}`,
      data: toJson({ email, bookingId: booking.id ?? booking.booking_id, scheduledStart: booking.start_time ?? booking.scheduled_time ?? booking.starts_at, pageId: booking.page_id ?? booking.event_type_id, status: "scheduled" }),
    },
  }).catch(() => {});
}

async function handleBookingCanceled(
  booking: Record<string, unknown>,
  organizationId: string
) {
  const email = (booking.email ?? (booking.booker as Record<string, string>)?.email) as string | undefined;
  if (!email) return;

  await db.event.updateMany({
    where: {
      organizationId,
      type: EventType.BOOKING,
      source: EventSource.SCHEDULEONCE_WEBHOOK,
      data: { path: ["email"], equals: email },
    },
    data: {
      data: {
        email,
        canceled: true,
        canceledAt: new Date().toISOString(),
      },
    },
  }).catch(() => {});
}
