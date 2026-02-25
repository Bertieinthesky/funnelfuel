import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateRange } from "@/lib/dashboard/date-range";
import {
  getFunnelTimeSeries,
  getMetricTimeSeries,
} from "@/lib/dashboard/funnel-detail";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; funnelId: string }> }
) {
  const { orgId, funnelId } = await params;
  const { searchParams } = new URL(req.url);
  const range = parseDateRange(searchParams.get("range"));
  const metricId = searchParams.get("metricId");

  // If a specific metric is requested, return its daily time series
  if (metricId) {
    const metric = await db.metric.findFirst({
      where: { id: metricId, organizationId: orgId },
      include: {
        numeratorMetric: { include: { numeratorMetric: true, denominatorMetric: true } },
        denominatorMetric: { include: { numeratorMetric: true, denominatorMetric: true } },
      },
    });
    if (!metric) {
      return NextResponse.json({ error: "Metric not found" }, { status: 404 });
    }

    const data = await getMetricTimeSeries(orgId, metric, range, funnelId);
    return NextResponse.json(data);
  }

  // Default: events + revenue time series
  const data = await getFunnelTimeSeries(orgId, funnelId, range);
  return NextResponse.json(data);
}
