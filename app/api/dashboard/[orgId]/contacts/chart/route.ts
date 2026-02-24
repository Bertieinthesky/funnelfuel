import { NextRequest, NextResponse } from "next/server";
import { getContactsPerDay } from "@/lib/dashboard/queries";
import { EventType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const sp = req.nextUrl.searchParams;

  const days = Math.min(Math.max(parseInt(sp.get("days") || "3", 10) || 3, 1), 365);

  const filters: {
    eventType?: EventType;
    tag?: string;
    source?: string;
  } = {};

  const eventType = sp.get("eventType");
  if (eventType && Object.values(EventType).includes(eventType as EventType)) {
    filters.eventType = eventType as EventType;
  }

  const tag = sp.get("tag");
  if (tag) filters.tag = tag;

  const source = sp.get("source");
  if (source) filters.source = source;

  try {
    const data = await getContactsPerDay(orgId, days, filters);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
