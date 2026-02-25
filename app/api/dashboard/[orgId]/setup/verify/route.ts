import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "pixel";

  if (type === "pixel") {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const pageViewCount = await db.pageView.count({
      where: {
        session: { organizationId: orgId },
        timestamp: { gte: fiveMinutesAgo },
      },
    });

    const pixelEventCount = await db.event.count({
      where: {
        organizationId: orgId,
        source: "PIXEL",
        timestamp: { gte: fiveMinutesAgo },
      },
    });

    return NextResponse.json({
      ok: true,
      pixel: {
        pageViews: pageViewCount,
        events: pixelEventCount,
        active: pageViewCount > 0 || pixelEventCount > 0,
      },
    });
  }

  if (type === "webhooks") {
    // Find latest event per source for this org (only webhook sources)
    const webhookSources = [
      "STRIPE_WEBHOOK",
      "CLICKFUNNELS_WEBHOOK",
      "GHL_WEBHOOK",
      "CALENDLY_WEBHOOK",
      "TYPEFORM_WEBHOOK",
      "JOTFORM_WEBHOOK",
      "ZAPIER_WEBHOOK",
      "SCHEDULEONCE_WEBHOOK",
      "WHOP_WEBHOOK",
    ] as const;

    const results: Record<string, { lastReceived: string | null; count: number }> = {};

    await Promise.all(
      webhookSources.map(async (source) => {
        const [latest, count] = await Promise.all([
          db.event.findFirst({
            where: { organizationId: orgId, source },
            orderBy: { timestamp: "desc" },
            select: { timestamp: true },
          }),
          db.event.count({
            where: { organizationId: orgId, source },
          }),
        ]);

        results[source] = {
          lastReceived: latest?.timestamp.toISOString() ?? null,
          count,
        };
      })
    );

    return NextResponse.json({ ok: true, webhooks: results });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
