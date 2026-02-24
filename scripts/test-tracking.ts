/**
 * Funnel Fuel — End-to-End Tracking Test
 *
 * Run with:   npx tsx scripts/test-tracking.ts
 * Requires:   npm run dev   running in another terminal
 *
 * What it tests:
 *   1. Pixel page_view   → session created, UTMs & landing page captured
 *   2. Pixel form_submit → contact + identity signal created, FORM_SUBMIT event recorded
 *   3. GHL webhook       → same email stitches to same contact (no duplicate)
 *   4. Dedup             → retrying the same form_submit doesn't create a 2nd event
 *   5. URL rule          → page_view on /thank-you fires a PURCHASE event
 *   6. excludePattern    → page_view on /thank-you-variant does NOT fire the same rule
 *
 * Cleans up all test data when done.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// ─── helpers ──────────────────────────────────────────────────────────────────

function ok(label: string)   { console.log(`  ✓ ${label}`); }
function fail(label: string) { console.log(`  ✗ ${label}`); process.exitCode = 1; }
function check(label: string, pass: boolean) { pass ? ok(label) : fail(label); }

async function post(path: string, body: unknown, query?: string) {
  const url = `${BASE}${path}${query ? "?" + query : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// ─── test ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  Funnel Fuel — Tracking Test");
  console.log("══════════════════════════════════════════════\n");

  const RUN     = Date.now().toString(36);
  const EMAIL   = `test_${RUN}@example.com`;
  const SESSION = `sess_${RUN}`;
  const FP      = `fp_${RUN}`;

  // ── Setup: throw-away org + URL rule ──────────────────────────────────────
  const org = await db.organization.create({
    data: { name: `Test Org ${RUN}`, publicKey: `pk_test_${RUN}` },
  });

  // Rule: fires PURCHASE on /thank-you, but NOT on /thank-you-v* (variant pages)
  const urlRule = await db.urlRule.create({
    data: {
      organizationId: org.id,
      name: "Thank You Page",
      pattern: "**/thank-you",
      excludePattern: "**/thank-you-v*",
      eventType: "PURCHASE",
      tags: ["buyer"],
      isActive: true,
    },
  });

  console.log(`Test org:    ${org.id}`);
  console.log(`URL rule:    "${urlRule.pattern}" (exclude: "${urlRule.excludePattern}")\n`);

  try {

    // ── 1. Pixel page_view ─────────────────────────────────────────────────
    console.log("── 1. Pixel page_view ──────────────────────────");
    const pv = await post("/api/pixel", {
      orgKey: org.publicKey,
      sessionId: SESSION,
      fingerprint: FP,
      type: "page_view",
      url: "http://localhost:3000/sales-page",
      path: "/sales-page",
      referrer: null,
      utms: { utm_source: "facebook", utm_campaign: "test-campaign" },
      data: { title: "Sales Page" },
      ts: Date.now(),
    });
    console.log(`  HTTP ${pv.status}`, pv.body);
    check("200 response", pv.status === 200);

    const session = await db.session.findUnique({ where: { sessionKey: SESSION } });
    check("Session created", !!session);
    check("UTM source captured (facebook)", session?.utmSource === "facebook");
    check("Landing page captured", session?.landingPage === "http://localhost:3000/sales-page");
    check("visitCount starts at 1", session?.visitCount === 1);

    // ── 2. Pixel form_submit ───────────────────────────────────────────────
    console.log("\n── 2. Pixel form_submit ────────────────────────");
    const fs = await post("/api/pixel", {
      orgKey: org.publicKey,
      sessionId: SESSION,
      fingerprint: FP,
      type: "form_submit",
      url: "http://localhost:3000/optin",
      path: "/optin",
      referrer: null,
      utms: {},
      data: {
        contact: { email: EMAIL, firstName: "Test", lastName: "User" },
        formAction: "/submit",
        formId: "optin-form",
        title: "Opt-in Page",
      },
      ts: Date.now(),
    });
    console.log(`  HTTP ${fs.status}`, fs.body);
    check("200 response", fs.status === 200);

    const contact = await db.contact.findFirst({
      where: { organizationId: org.id, email: EMAIL },
      include: { identitySignals: true },
    });
    check("Contact created", !!contact);
    check("Email signal stored (confidence 90)", contact?.identitySignals.find(s => s.type === "EMAIL")?.confidence === 90);

    const fsEvent = await db.event.findFirst({
      where: { organizationId: org.id, type: "FORM_SUBMIT" },
    });
    check("FORM_SUBMIT event recorded", !!fsEvent);
    check("externalId set (dedup key present)", !!fsEvent?.externalId);

    // ── 3. GHL webhook — same email → stitches to same contact ─────────────
    console.log("\n── 3. GHL webhook (same email) ─────────────────");
    const ghl = await post(
      "/api/webhooks/ghl",
      {
        type: "ContactCreate",
        id: `ghl-${RUN}`,
        contact: { email: EMAIL, firstName: "Test", lastName: "User", phone: "+15551234567" },
      },
      `orgId=${org.id}`
    );
    console.log(`  HTTP ${ghl.status}`, ghl.body);
    check("200 response", ghl.status === 200);

    const contactCount = await db.contact.count({ where: { organizationId: org.id } });
    check("Still 1 contact (stitched, not duplicated)", contactCount === 1);

    const optIn = await db.event.findFirst({ where: { organizationId: org.id, type: "OPT_IN" } });
    check("OPT_IN event recorded", !!optIn);

    const phoneSignal = await db.identitySignal.findFirst({
      where: { contact: { organizationId: org.id }, type: "PHONE" },
    });
    check("Phone signal merged onto existing contact", !!phoneSignal);

    // ── 4. Dedup test ──────────────────────────────────────────────────────
    console.log("\n── 4. Dedup (retry same form_submit) ───────────");
    await post("/api/pixel", {
      orgKey: org.publicKey,
      sessionId: SESSION,
      fingerprint: FP,
      type: "form_submit",
      url: "http://localhost:3000/optin",
      path: "/optin",
      referrer: null,
      utms: {},
      data: { contact: { email: EMAIL }, title: "Opt-in Page" },
      ts: Date.now(),
    });

    const fsCount = await db.event.count({ where: { organizationId: org.id, type: "FORM_SUBMIT" } });
    check("FORM_SUBMIT count still 1 (deduped)", fsCount === 1);

    // ── 5. URL rule fires on matching page ─────────────────────────────────
    console.log("\n── 5. URL rule — /thank-you fires PURCHASE ─────");
    const tySession = `sess_ty_${RUN}`;
    const pvTy = await post("/api/pixel", {
      orgKey: org.publicKey,
      sessionId: tySession,
      fingerprint: FP,          // same fingerprint = same person
      type: "page_view",
      url: "http://localhost:3000/thank-you",
      path: "/thank-you",
      referrer: null,
      utms: {},
      data: { title: "Thank You" },
      ts: Date.now(),
    });
    console.log(`  HTTP ${pvTy.status}`, pvTy.body);
    check("200 response", pvTy.status === 200);

    const purchaseEvent = await db.event.findFirst({
      where: { organizationId: org.id, type: "PURCHASE" },
    });
    check("PURCHASE event fired by URL rule", !!purchaseEvent);
    check("Event source is PIXEL", purchaseEvent?.source === "PIXEL");

    // ── 6. excludePattern blocks /thank-you-variant ─────────────────────────
    console.log("\n── 6. excludePattern — /thank-you-variant is skipped");
    const varSession = `sess_var_${RUN}`;
    const pvVar = await post("/api/pixel", {
      orgKey: org.publicKey,
      sessionId: varSession,
      fingerprint: `fp_var_${RUN}`,
      type: "page_view",
      url: "http://localhost:3000/thank-you-variant",
      path: "/thank-you-variant",
      referrer: null,
      utms: {},
      data: { title: "Thank You Variant" },
      ts: Date.now(),
    });
    console.log(`  HTTP ${pvVar.status}`, pvVar.body);
    check("200 response", pvVar.status === 200);

    // Should still be just 1 PURCHASE event (the variant page must not trigger another)
    const purchaseCount = await db.event.count({ where: { organizationId: org.id, type: "PURCHASE" } });
    check("PURCHASE count still 1 (variant excluded)", purchaseCount === 1);

  } finally {
    // Cascade delete from org handles contacts, sessions, signals
    await db.event.deleteMany({ where: { organizationId: org.id } });
    await db.organization.delete({ where: { id: org.id } });
    await db.$disconnect();
    console.log("\n  ✓ Test data cleaned up");
  }

  const code = process.exitCode ?? 0;
  console.log("\n══════════════════════════════════════════════");
  if (code === 0) {
    console.log("  All checks passed ✓");
  } else {
    console.log("  Some checks FAILED — see ✗ above");
  }
  console.log("══════════════════════════════════════════════\n");
}

main().catch((err) => { console.error(err); process.exit(1); });
