/**
 * Split Test Router — /go/[slug]
 *
 * This is the traffic splitting endpoint. Clients point their ads/links here
 * instead of directly to a variant URL. We assign visitors to variants
 * (weighted random), keep the assignment sticky via cookie, and redirect.
 *
 * Example:
 *   Experiment slug: "optin-test"
 *   Client sends traffic to: https://app.funnelfuel.ai/go/optin-test
 *   We redirect to: /variant-a or /variant-b based on weight
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ASSIGNMENT_COOKIE_PREFIX = "_ff_exp_";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Look up the experiment
  const experiment = await db.experiment.findUnique({
    where: { slug },
    include: { variants: true },
  });

  if (!experiment) {
    return new NextResponse("Experiment not found", { status: 404 });
  }

  if (experiment.status !== "ACTIVE") {
    // If not active, send to the first variant as a fallback
    const fallback = experiment.variants[0];
    if (fallback) {
      return NextResponse.redirect(fallback.url);
    }
    return new NextResponse("Experiment not active", { status: 404 });
  }

  if (experiment.variants.length === 0) {
    return new NextResponse("No variants configured", { status: 500 });
  }

  const cookieName = ASSIGNMENT_COOKIE_PREFIX + experiment.id;

  // Check for existing assignment cookie
  const existingVariantId = req.cookies.get(cookieName)?.value;
  if (existingVariantId) {
    const existingVariant = experiment.variants.find(
      (v) => v.id === existingVariantId
    );
    if (existingVariant) {
      return NextResponse.redirect(existingVariant.url);
    }
  }

  // Also check the session's existing assignment in the DB
  const sessionKey = req.cookies.get("_ff_sid")?.value;
  if (sessionKey) {
    const dbAssignment = await db.experimentAssignment.findUnique({
      where: {
        sessionKey_experimentId: {
          sessionKey,
          experimentId: experiment.id,
        },
      },
      include: { variant: true },
    });
    if (dbAssignment) {
      const res = NextResponse.redirect(dbAssignment.variant.url);
      // Reinstate cookie if missing
      res.cookies.set(cookieName, dbAssignment.variantId, {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
      });
      return res;
    }
  }

  // Assign to a new variant using weighted random selection
  const selectedVariant = selectVariant(experiment.variants);

  // Persist assignment in DB
  if (sessionKey) {
    await db.experimentAssignment.create({
      data: {
        sessionKey,
        experimentId: experiment.id,
        variantId: selectedVariant.id,
      },
    }).catch(() => {}); // ignore if session doesn't exist yet (pixel fires async)
  }

  // Redirect with sticky cookie
  const redirectRes = NextResponse.redirect(selectedVariant.url);
  redirectRes.cookies.set(cookieName, selectedVariant.id, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return redirectRes;
}

/** Weighted random variant selection */
function selectVariant(variants: Array<{ id: string; url: string; weight: number }>) {
  const total = variants.reduce((sum, v) => sum + v.weight, 0);
  let rand = Math.random() * total;

  for (const variant of variants) {
    rand -= variant.weight;
    if (rand <= 0) return variant;
  }

  // Fallback to last variant
  return variants[variants.length - 1];
}
