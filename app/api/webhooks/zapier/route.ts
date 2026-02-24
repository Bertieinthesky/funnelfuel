import { toJson } from "@/lib/json";
import { deterministicId } from "@/lib/idempotency";
/**
 * Zapier Webhook Handler (Catch Hook)
 *
 * This is a generic receiver for events sent via Zapier's "Webhooks by Zapier"
 * action. Use this when a tool doesn't have a native integration — just point
 * a Zapier webhook action at this URL and map your fields.
 *
 * Zapier URL to configure:
 *   https://app.funnelfuel.ai/api/webhooks/zapier?orgId=YOUR_ORG_ID&event=EVENT_TYPE
 *
 * Supported ?event= values:
 *   opt_in | purchase | booking | application | webinar_register | webinar_attend | custom
 *
 * Expected JSON body (Zapier maps your source app fields to these):
 *   {
 *     "email": "john@example.com",
 *     "phone": "+1234567890",       (optional)
 *     "first_name": "John",         (optional)
 *     "last_name": "Doe",           (optional)
 *     "amount": 97,                 (optional, for purchase events)
 *     "currency": "usd",            (optional)
 *     "product_name": "...",        (optional)
 *     "external_id": "...",         (optional, for dedup)
 *     "lead_quality": "high",       (optional: high | medium | low)
 *     "tags": "tag1,tag2"           (optional, comma-separated)
 *   }
 *
 * Auth: Add ZAPIER_WEBHOOK_SECRET to env, then include it as ?secret=xxx
 * in the webhook URL in Zapier.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stitchIdentity } from "@/lib/identity/stitch";
import { EventSource, EventType, LeadQuality } from "@prisma/client";

const EVENT_TYPE_MAP: Record<string, EventType> = {
  opt_in: EventType.OPT_IN,
  optin: EventType.OPT_IN,
  purchase: EventType.PURCHASE,
  booking: EventType.BOOKING,
  booking_confirmed: EventType.BOOKING_CONFIRMED,
  application: EventType.APPLICATION_SUBMIT,
  application_submit: EventType.APPLICATION_SUBMIT,
  webinar_register: EventType.WEBINAR_REGISTER,
  webinar_attend: EventType.WEBINAR_ATTEND,
  webinar_cta: EventType.WEBINAR_CTA_CLICK,
  custom: EventType.CUSTOM,
};

const LEAD_QUALITY_MAP: Record<string, LeadQuality> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const organizationId = url.searchParams.get("orgId");
  const eventParam = (url.searchParams.get("event") ?? "custom").toLowerCase();
  const secret = url.searchParams.get("secret") ?? req.headers.get("x-zapier-secret") ?? "";
  const expectedSecret = process.env.ZAPIER_WEBHOOK_SECRET ?? "";

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  if (!organizationId) {
    return NextResponse.json({ error: "No organizationId" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? body.Email) as string | undefined;
  const phone = (body.phone ?? body.Phone) as string | undefined;
  const firstName = (body.first_name ?? body.firstName ?? body["First Name"]) as string | undefined;
  const lastName = (body.last_name ?? body.lastName ?? body["Last Name"]) as string | undefined;

  if (!email && !phone) {
    return NextResponse.json({ error: "No contact info" }, { status: 400 });
  }

  let contactId: string;
  try {
    const result = await stitchIdentity(
      organizationId,
      "zapier-" + String(body.external_id ?? email ?? deterministicId("zapier", email, organizationId)),
      { email, phone, firstName, lastName }
    );
    contactId = result.contactId;
  } catch (err) {
    console.error("[webhook/zapier] Stitch error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  const eventType = EVENT_TYPE_MAP[eventParam] ?? EventType.CUSTOM;
  const externalId = body.external_id
    ? String(body.external_id)
    : deterministicId("zapier", email, eventParam, organizationId);

  // Handle purchase events with revenue data
  if (eventType === EventType.PURCHASE && body.amount) {
    const amountCents = Math.round(Number(body.amount) * 100);
    await db.payment.create({
      data: {
        contactId,
        organizationId,
        amountCents,
        currency: (body.currency as string) ?? "usd",
        processor: "zapier",
        externalId: `payment-${externalId}`,
        productName: (body.product_name as string) ?? null,
        status: "succeeded",
      },
    }).catch(() => {});
  }

  // Handle lead quality
  const leadQualityRaw = (body.lead_quality as string ?? "").toLowerCase();
  const leadQuality = LEAD_QUALITY_MAP[leadQualityRaw];
  if (leadQuality) {
    await db.contact.update({
      where: { id: contactId },
      data: { leadQuality },
    }).catch(() => {});
  }

  // Handle tags
  const tagsRaw = body.tags as string | undefined;
  if (tagsRaw) {
    const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      await db.contact.update({
        where: { id: contactId },
        data: { tags: { push: tags } },
      }).catch(() => {});
    }
  }

  await db.event.create({
    data: {
      organizationId,
      contactId,
      type: eventType,
      source: EventSource.ZAPIER_WEBHOOK,
      confidence: 85,
      externalId,
      data: toJson({ email, phone, source: "zapier", eventParam, rawBody: body }),
    },
  }).catch(() => {});

  return NextResponse.json({ received: true, contactId });
}
