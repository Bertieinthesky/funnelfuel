import { NextRequest, NextResponse } from "next/server";
import { parseDateRange } from "@/lib/dashboard/date-range";
import { getFunnelSourceBreakdown } from "@/lib/dashboard/funnel-detail";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; funnelId: string }> }
) {
  const { orgId, funnelId } = await params;
  const { searchParams } = new URL(req.url);
  const range = parseDateRange(searchParams.get("range"));

  const data = await getFunnelSourceBreakdown(orgId, funnelId, range);
  return NextResponse.json(data);
}
