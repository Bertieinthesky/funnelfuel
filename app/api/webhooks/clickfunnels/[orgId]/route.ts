// ClickFunnels Webhook Handler — org ID in path (no query params)
// Handles form submissions from ClickFunnels Classic and CF 2.0.
//
// Setup in ClickFunnels:
//   Classic: Funnel → Step Settings → Integrations → Webhook → add URL
//   2.0:     Workspace → Settings → Webhooks → add URL
//
// Webhook URL format:
//   https://tracking.funnelfuel.ai/api/webhooks/clickfunnels/YOUR_ORG_ID

import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { db } from "@/lib/db";
import { stitchIdentity } from "@/lib/identity/stitch";
import { toJson } from "@/lib/json";
import { deterministicId } from "@/lib/idempotency";
import { sanitizeContact } from "@/lib/schemas/webhooks";
import { EventSource, EventType } from "@prisma/client";

// CF pings the URL with GET (and sometimes OPTIONS) to verify it's reachable
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId: organizationId } = await params;

  // Read the body eagerly — req is not readable after response is sent
  const contentType = req.headers.get("content-type") ?? "";
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Respond immediately so CF doesn't time out during verification
  // All DB work runs via waitUntil after the response is sent
  waitUntil(processWebhook(organizationId, contentType, rawBody));

  return NextResponse.json({ received: true });
}

async function processWebhook(
  organizationId: string,
  contentType: string,
  rawBody: string
) {
  try {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) return;

    let fields: Record<string, string> = {};

    if (contentType.includes("application/json")) {
      // CF Classic and CF 2.0 JSON format
      const json = JSON.parse(rawBody) as Record<string, unknown>;
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
      const p = new URLSearchParams(rawBody);
      fields = {
        email:     p.get("email")      ?? p.get("inf_field_Email")     ?? "",
        phone:     p.get("phone")      ?? p.get("inf_field_Phone1")    ?? "",
        firstName: p.get("first_name") ?? p.get("inf_field_FirstName") ?? p.get("name")?.split(" ")[0] ?? "",
        lastName:  p.get("last_name")  ?? p.get("inf_field_LastName")  ?? p.get("name")?.split(" ").slice(1).join(" ") ?? "",
        id:        p.get("contact_id") ?? p.get("submission_id")       ?? "",
        pageUrl:   p.get("page_url")   ?? p.get("funnel_step_url")     ?? "",
      };
    }

    const contact = sanitizeContact({
      email:     fields.email     || undefined,
      phone:     fields.phone     || undefined,
      firstName: fields.firstName || undefined,
      lastName:  fields.lastName  || undefined,
    });

    if (!contact.email && !contact.phone) return;

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

  } catch (err) {
    console.error("[webhook/clickfunnels] Error:", err);
  }
}
