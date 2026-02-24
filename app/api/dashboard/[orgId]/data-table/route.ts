import { NextRequest, NextResponse } from "next/server";
import { getDataTableResults, type DataTableConfig } from "@/lib/dashboard/data-table";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  try {
    const config: DataTableConfig = await req.json();
    const results = await getDataTableResults(orgId, config);
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
