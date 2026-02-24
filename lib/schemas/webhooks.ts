import { z } from "zod";
import { NextResponse } from "next/server";

// Reusable contact shape used across all webhook handlers
export const WebhookContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export type WebhookContact = z.infer<typeof WebhookContactSchema>;

/**
 * Validate and sanitize a contact object extracted from a webhook payload.
 * Returns null fields for anything that fails validation instead of throwing —
 * we never want to drop an otherwise valid event just because a phone is badly formatted.
 */
export function sanitizeContact(raw: {
  email?: unknown;
  phone?: unknown;
  firstName?: unknown;
  lastName?: unknown;
}): { email?: string; phone?: string; firstName?: string; lastName?: string } {
  const result: ReturnType<typeof sanitizeContact> = {};

  if (typeof raw.email === "string" && z.string().email().safeParse(raw.email).success) {
    result.email = raw.email.trim().toLowerCase();
  }
  if (typeof raw.phone === "string" && raw.phone.replace(/\D/g, "").length >= 7) {
    result.phone = raw.phone.trim();
  }
  if (typeof raw.firstName === "string" && raw.firstName.trim()) {
    result.firstName = raw.firstName.trim().slice(0, 100);
  }
  if (typeof raw.lastName === "string" && raw.lastName.trim()) {
    result.lastName = raw.lastName.trim().slice(0, 100);
  }

  return result;
}

/**
 * Extract and validate the orgId query param from a webhook URL.
 * Returns a 400 response if missing, or null if valid (caller should check).
 */
export function getOrgId(url: URL): { orgId: string } | NextResponse {
  const orgId = url.searchParams.get("orgId");
  if (!orgId || orgId.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing required query param: orgId" },
      { status: 400 }
    );
  }
  return { orgId: orgId.trim() };
}
