/**
 * JotForm Webhook Handler
 *
 * JotForm sends form submissions as POST with application/x-www-form-urlencoded
 * (or JSON depending on configuration). We handle both.
 *
 * Setup in JotForm: Form → Settings → Integrations → Webhooks → add URL:
 *   https://app.funnelfuel.ai/api/webhooks/jotform?orgId=YOUR_ORG_ID
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stitchIdentity } from "@/lib/identity/stitch";
import { toJson } from "@/lib/json";
import { deterministicId } from "@/lib/idempotency";
import { sanitizeContact } from "@/lib/schemas/webhooks";
import { EventSource, EventType } from "@prisma/client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s\-\+\(\)]{7,}$/;

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const organizationId = url.searchParams.get("orgId");
  if (!organizationId) {
    return NextResponse.json({ error: "No organizationId" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let fields: Record<string, string> = {};

  if (contentType.includes("application/json")) {
    const json = await req.json().catch(() => ({}));
    fields = flattenJotformJson(json);
  } else {
    // JotForm default: form-urlencoded
    const text = await req.text();
    const params = new URLSearchParams(text);
    // JotForm wraps answers in rawRequest JSON
    const raw = params.get("rawRequest");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        fields = flattenJotformJson(parsed);
      } catch {
        params.forEach((value, key) => {
          fields[key] = value;
        });
      }
    } else {
      params.forEach((value, key) => {
        fields[key] = value;
      });
    }
  }

  const rawContact = extractJotformContact(fields);
  const contact = sanitizeContact(rawContact);

  if (!contact.email && !contact.phone) {
    return NextResponse.json({ received: true });
  }

  // submissionID is stable across retries; fall back to deterministic hash
  const submissionId = fields.submissionID ?? fields.submission_id;
  const externalId = submissionId
    ? `jotform-${submissionId}`
    : deterministicId("jotform", contact.email, fields.formID ?? fields.form_id, organizationId);

  try {
    const { contactId } = await stitchIdentity(
      organizationId,
      "jotform-" + (submissionId ?? contact.email),
      contact
    );

    await db.event.create({
      data: {
        organizationId,
        contactId,
        type: EventType.OPT_IN,
        source: EventSource.JOTFORM_WEBHOOK,
        confidence: 90,
        externalId,
        data: toJson({
          email: contact.email,
          phone: contact.phone,
          formId: fields.formID ?? fields.form_id,
          submissionId,
        }),
      },
    }).catch(() => {});

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/jotform] Error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

function flattenJotformJson(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const flatKey = prefix ? `${prefix}_${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenJotformJson(value as Record<string, unknown>, flatKey));
    } else {
      result[flatKey] = String(value ?? "");
    }
  }

  return result;
}

function extractJotformContact(fields: Record<string, string>) {
  const contact: { email?: string; phone?: string; firstName?: string; lastName?: string } = {};

  for (const [key, value] of Object.entries(fields)) {
    const k = key.toLowerCase();
    const v = value.trim();
    if (!v) continue;

    if (!contact.email && EMAIL_PATTERN.test(v)) {
      contact.email = v;
    } else if (!contact.phone && PHONE_PATTERN.test(v) && v.replace(/\D/g, "").length >= 7) {
      contact.phone = v;
    }

    if (k.includes("first") || k === "fname") contact.firstName = v;
    else if (k.includes("last") || k === "lname") contact.lastName = v;
    else if (k.includes("email") && !contact.email) contact.email = v;
    else if (k.includes("phone") && !contact.phone) contact.phone = v;
  }

  return contact;
}
