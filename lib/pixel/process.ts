// Pixel Event Processor
// Handles page_view and form_submit events from the browser pixel.

import { db } from "@/lib/db";
import { stitchIdentity } from "@/lib/identity/stitch";
import { matchAndFireUrlRules } from "@/lib/url-rules/match";
import { toJson } from "@/lib/json";
import { EventSource, EventType } from "@prisma/client";
import type { PixelPayload } from "@/lib/schemas/pixel";

export type { PixelPayload };

const THIRTY_MINUTES = 30 * 60 * 1000;

export async function processPixelEvent(
  payload: PixelPayload,
  clientIp: string | null,
  userAgent: string | null = null
): Promise<{ ok: boolean; error?: string }> {
  // 1. Look up organization by publicKey
  const org = await db.organization.findUnique({
    where: { publicKey: payload.orgKey },
    select: { id: true },
  });

  if (!org) {
    return { ok: false, error: "Unknown organization key" };
  }

  const organizationId = org.id;
  const now = new Date();

  // 2. Upsert session + detect new visits (30-min inactivity = new visit)
  const existing = await db.session.findUnique({
    where: { sessionKey: payload.sessionId },
    select: { id: true, contactId: true, lastSeen: true, visitCount: true },
  });

  const isNewVisit =
    !!existing &&
    now.getTime() - existing.lastSeen.getTime() > THIRTY_MINUTES;

  const session = await db.session.upsert({
    where: { sessionKey: payload.sessionId },
    create: {
      sessionKey: payload.sessionId,
      organizationId,
      fingerprint: payload.fingerprint,
      utmSource: payload.utms?.utm_source ?? null,
      utmMedium: payload.utms?.utm_medium ?? null,
      utmCampaign: payload.utms?.utm_campaign ?? null,
      utmContent: payload.utms?.utm_content ?? null,
      utmTerm: payload.utms?.utm_term ?? null,
      referrer: payload.referrer ?? null,
      landingPage: payload.url,
      ip: clientIp,
      userAgent,
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
    },
    update: {
      lastSeen: now,
      fingerprint: payload.fingerprint,
      // Increment visitCount when visitor returns after 30-min gap
      ...(isNewVisit ? { visitCount: { increment: 1 } } : {}),
    },
  });

  let contactId: string | null = session.contactId;

  // 3. Handle form_submit — identity stitching
  if (payload.type === "form_submit" && payload.data?.contact) {
    const contact = payload.data.contact;

    if (contact.email || contact.phone) {
      const result = await stitchIdentity(
        organizationId,
        payload.sessionId,
        contact,
        payload.fingerprint
      );
      contactId = result.contactId;

      // Idempotency key: use the original form page path so confirmation-page
      // fallback fires deduplicate against the form-page fire.
      const formPath = payload.data?.formPath ?? payload.path;
      const externalId = `pixel-form-${payload.sessionId}-${formPath}-${now.toISOString().slice(0, 13)}`;

      await db.event
        .create({
          data: {
            organizationId,
            contactId,
            sessionId: session.id,
            type: EventType.FORM_SUBMIT,
            source: EventSource.PIXEL,
            confidence: result.confidence,
            externalId,
            data: toJson({
              email: contact.email,
              phone: contact.phone,
              formAction: payload.data.formAction,
              formId: payload.data.formId,
              url: payload.url,
            }),
          },
        })
        .catch(() => {}); // unique constraint = duplicate, silently ignore
    }
  }

  // 4. Record page view
  await db.pageView.create({
    data: {
      sessionId: session.id,
      contactId,
      url: payload.url,
      path: payload.path,
      title: payload.data?.title ?? null,
      timestamp: new Date(payload.ts),
    },
  });

  // 5. Match URL rules and fire any tagged events
  const assignment = await db.experimentAssignment.findFirst({
    where: {
      sessionKey: payload.sessionId,
      experiment: { status: "ACTIVE", organizationId },
    },
    select: { variantId: true },
  });

  await matchAndFireUrlRules({
    organizationId,
    url: payload.url,
    path: payload.path,
    contactId,
    sessionId: session.id,
    variantId: assignment?.variantId ?? null,
  });

  // 6. Update data health alert timestamps
  await db.alert.updateMany({
    where: { organizationId, isActive: true },
    data: { lastEventAt: now },
  });

  return { ok: true };
}
