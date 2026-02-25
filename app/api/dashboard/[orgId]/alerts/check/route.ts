import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AlertType, EventType } from "@prisma/client";

// Maps alert types to the event types they monitor
const ALERT_EVENT_MAP: Record<AlertType, EventType[] | null> = {
  NO_EVENTS: null, // any event
  NO_OPT_INS: [EventType.OPT_IN, EventType.FORM_SUBMIT],
  NO_PURCHASES: [EventType.PURCHASE],
  NO_BOOKINGS: [EventType.BOOKING, EventType.BOOKING_CONFIRMED],
  NO_PAGE_VIEWS: [EventType.PAGE_VIEW],
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const now = new Date();

  const alerts = await db.alert.findMany({
    where: { organizationId: orgId, isActive: true },
  });

  const fired: string[] = [];

  for (const alert of alerts) {
    const cutoff = new Date(now.getTime() - alert.thresholdHours * 3600000);

    const eventTypes = ALERT_EVENT_MAP[alert.type];

    const latestEvent = await db.event.findFirst({
      where: {
        organizationId: orgId,
        ...(alert.funnelId ? { funnelId: alert.funnelId } : {}),
        ...(alert.funnelStepId ? { funnelStepId: alert.funnelStepId } : {}),
        ...(eventTypes ? { type: { in: eventTypes } } : {}),
        timestamp: { gte: cutoff },
      },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    });

    if (!latestEvent) {
      // No qualifying events within the threshold — fire alert
      fired.push(alert.id);
      await db.alert.update({
        where: { id: alert.id },
        data: { lastFiredAt: now },
      });
    } else {
      // Update last event time
      await db.alert.update({
        where: { id: alert.id },
        data: { lastEventAt: latestEvent.timestamp },
      });
    }
  }

  return NextResponse.json({
    checked: alerts.length,
    fired: fired.length,
    firedAlertIds: fired,
  });
}
