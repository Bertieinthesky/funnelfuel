import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateRange } from "@/components/dashboard/date-range-picker";
import { getKpiMetrics, getRecentEvents } from "@/lib/dashboard/queries";

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");

  try {
    const org = await db.organization.findFirst({
      select: { id: true, name: true },
    });

    if (!orgId) {
      return NextResponse.json({
        ok: true,
        dbConnected: true,
        org: org ? { id: org.id, name: org.name } : null,
        hint: "Add ?orgId=... to test dashboard queries",
      });
    }

    const dateRange = parseDateRange("30d");
    const kpis = await getKpiMetrics(orgId, dateRange);
    const events = await getRecentEvents(orgId, 5);

    return NextResponse.json({
      ok: true,
      orgId,
      kpis,
      recentEvents: events.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({
      ok: false,
      error: message,
      stack: stack?.split("\n").slice(0, 5),
    }, { status: 500 });
  }
}
