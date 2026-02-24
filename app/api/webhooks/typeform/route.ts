// Typeform Webhook Handler
// Extracts email/phone/name from form answers, stitches identity, fires OPT_IN or APPLICATION_SUBMIT.
// Setup: Workspace → Connect → Webhooks → https://app.funnelfuel.ai/api/webhooks/typeform?orgId=ORG_ID

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stitchIdentity } from "@/lib/identity/stitch";
import { toJson } from "@/lib/json";
import { deterministicId } from "@/lib/idempotency";
import { sanitizeContact } from "@/lib/schemas/webhooks";
import { EventSource, EventType } from "@prisma/client";
import { createHmac } from "crypto";

function verifyTypeformSignature(body: string, signature: string, secret: string): boolean {
  const expected =
    "sha256=" + createHmac("sha256", secret).update(body).digest("base64");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("typeform-signature") ?? "";
  const secret = process.env.TYPEFORM_WEBHOOK_SECRET ?? "";

  if (secret && sig && !verifyTypeformSignature(body, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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

  const formResponse = payload.form_response as Record<string, unknown>;
  if (!formResponse) {
    return NextResponse.json({ received: true });
  }

  // Extract contact fields from Typeform answers
  const contact = extractTypeformContact(formResponse);

  if (!contact.email && !contact.phone) {
    // Still record the submission event even without contact info
    return NextResponse.json({ received: true });
  }

  const sanitized = sanitizeContact(contact);
  if (!sanitized.email && !sanitized.phone) return NextResponse.json({ received: true });

  try {
    const { contactId } = await stitchIdentity(
      organizationId,
      "typeform-" + String(formResponse.token ?? sanitized.email ?? deterministicId("typeform", sanitized.email, organizationId)),
      sanitized
    );

    const answers = (formResponse.answers as unknown[]) ?? [];
    const isApplication = answers.length > 5;
    const eventType = isApplication ? EventType.APPLICATION_SUBMIT : EventType.OPT_IN;

    const leadQuality = extractLeadQuality(formResponse);
    if (leadQuality) {
      await db.contact.update({ where: { id: contactId }, data: { leadQuality } }).catch(() => {});
    }

    await db.event.create({
      data: {
        organizationId,
        contactId,
        type: eventType,
        source: EventSource.TYPEFORM_WEBHOOK,
        confidence: 90,
        externalId: formResponse.token
          ? `typeform-${String(formResponse.token)}`
          : deterministicId("typeform", sanitized.email, organizationId),
        data: toJson({ email: sanitized.email, phone: sanitized.phone, formId: (payload.form_response as Record<string, unknown>)?.form_id, submittedAt: formResponse.submitted_at, leadQuality }),
      },
    }).catch(() => {});

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/typeform] Error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

interface ExtractedContact {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

function extractTypeformContact(formResponse: Record<string, unknown>): ExtractedContact {
  const contact: ExtractedContact = {};
  const answers = (formResponse.answers as Array<Record<string, unknown>>) ?? [];

  for (const answer of answers) {
    const type = answer.type as string;
    const fieldRef = (answer.field as Record<string, string>)?.ref ?? "";

    if (type === "email") {
      contact.email = answer.email as string;
    } else if (type === "phone_number") {
      contact.phone = answer.phone_number as string;
    } else if (type === "text" || type === "short_text") {
      const text = (answer.text as string) ?? "";
      const refLower = fieldRef.toLowerCase();
      if (refLower.includes("first") || refLower.includes("fname")) {
        contact.firstName = text;
      } else if (refLower.includes("last") || refLower.includes("lname")) {
        contact.lastName = text;
      } else if (refLower.includes("name") && !contact.firstName) {
        const parts = text.split(" ");
        contact.firstName = parts[0];
        contact.lastName = parts.slice(1).join(" ");
      }
    }
  }

  return contact;
}

type LeadQualityValue = "HIGH" | "MEDIUM" | "LOW" | null;

function extractLeadQuality(formResponse: Record<string, unknown>): LeadQualityValue {
  const answers = (formResponse.answers as Array<Record<string, unknown>>) ?? [];

  for (const answer of answers) {
    const fieldRef = ((answer.field as Record<string, string>)?.ref ?? "").toLowerCase();

    // Look for income / investment / budget questions
    if (
      fieldRef.includes("income") ||
      fieldRef.includes("invest") ||
      fieldRef.includes("budget") ||
      fieldRef.includes("revenue")
    ) {
      const choice = (answer.choice as Record<string, string>)?.label ?? "";
      const text = (answer.text as string) ?? "";
      const combined = (choice + " " + text).toLowerCase();

      if (
        combined.includes("no") ||
        combined.includes("0") ||
        combined.includes("broke") ||
        combined.includes("can't")
      ) {
        return "LOW";
      } else if (
        combined.includes("10k") ||
        combined.includes("50k") ||
        combined.includes("100k") ||
        combined.includes("yes")
      ) {
        return "HIGH";
      } else {
        return "MEDIUM";
      }
    }
  }

  return null;
}
