// ClickFunnels Webhook Handler — org ID in path (no query params)
// Handles form submissions from ClickFunnels Classic and CF 2.0.
//
// Setup in ClickFunnels:
//   Classic: Funnel → Settings → Integrations → Webhook → add URL
//   2.0:     Workspace → Settings → Webhooks → add URL
//
// Webhook URL format:
//   https://funnelfuel.vercel.app/api/webhooks/clickfunnels/YOUR_ORG_ID
//
// CF Classic sends form data as application/x-www-form-urlencoded.
// CF 2.0 sends JSON with a contact object.
// Both are handled below.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stitchIdentity } from "@/lib/identity/stitch";
import { toJson } from "@/lib/json";
import { deterministicId } from "@/lib/idempotency";
import { sanitizeContact } from "@/lib/schemas/webhooks";
import { EventSource, EventType } from "@prisma/client";

// CF pings the URL with GET when you save the webhook to verify it's reachable
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId: organizationId } = await params;

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Unknown orgId" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let fields: Record<string, string> = {};

  try {
    if (contentType.includes("application/json")) {
      // CF 2.0 JSON format
      const json = await req.json() as Record<string, unknown>;
      const contact = (json.contact ?? json) as Record<string, unknown>;
      fields = {
        email:      String(contact.email      ?? json.email      ?? ""),
        phone:      String(contact.phone      ?? json.phone      ?? ""),
        firstName:  String(contact.first_name ?? contact.firstName ?? json.first_name ?? ""),
        lastName:   String(contact.last_name  ?? contact.lastName  ?? json.last_name  ?? ""),
        id:         String(contact.id         ?? json.id         ?? json.submission_id ?? ""),
        pageUrl:    String(json.page_url      ?? json.funnel_step_url ?? ""),
      };
    } else {
      // CF Classic urlencoded format
      const text = await req.text();
      const params = new URLSearchParams(text);
      fields = {
        email:     params.get("email")      ?? params.get("inf_field_Email")     ?? "",
        phone:     params.get("phone")      ?? params.get("inf_field_Phone1")    ?? "",
        firstName: params.get("first_name") ?? params.get("inf_field_FirstName") ?? params.get("name")?.split(" ")[0] ?? "",
        lastName:  params.get("last_name")  ?? params.get("inf_field_LastName")  ?? params.get("name")?.split(" ").slice(1).join(" ") ?? "",
        id:        params.get("contact_id") ?? params.get("submission_id")       ?? "",
        pageUrl:   params.get("page_url")   ?? params.get("funnel_step_url")     ?? "",
      };
    }
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const contact = sanitizeContact({
    email:     fields.email     || undefined,
    phone:     fields.phone     || undefined,
    firstName: fields.firstName || undefined,
    lastName:  fields.lastName  || undefined,
  });

  if (!contact.email && !contact.phone) {
    // No identifiable data — still return 200 so CF doesn't retry forever
    return NextResponse.json({ received: true, skipped: "no email or phone" });
  }

  try {
    const { contactId } = await stitchIdentity(
      organizationId,
      `cf-${fields.id || contact.email}`,
      contact
    );

    const externalId = fields.id
      ? `cf-submission-${fields.id}`
      : deterministicId("cf", "optin", contact.email, organizationId);

    await db.event.create({
      data: {
        organizationId,
        contactId,
        type: EventType.FORM_SUBMIT,
        source: EventSource.CLICKFUNNELS_WEBHOOK,
        confidence: 95,
        externalId,
        data: toJson({
          email:     contact.email,
          phone:     contact.phone,
          pageUrl:   fields.pageUrl || null,
          source:    "clickfunnels_webhook",
        }),
      },
    }).catch(() => {}); // unique constraint = already recorded, ignore

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/clickfunnels] Error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
