import { NextRequest, NextResponse } from "next/server";
import { getReportResults, type ReportConfig } from "@/lib/dashboard/report";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  try {
    const config: ReportConfig = await req.json();
    const results = await getReportResults(orgId, config);
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
