import { db } from "@/lib/db";
import type { DateRange } from "./queries";
import type { FunnelStep } from "@prisma/client";
import {
  evaluateMetric,
  formatMetricValue,
  type MetricWithRelations,
} from "./metric-eval";

// ─────────────────────────────────────────────────────────────────────────────
// Step Counts
// ─────────────────────────────────────────────────────────────────────────────

export interface StepCount {
  id: string;
  name: string;
  type: string;
  order: number;
  urlPattern: string | null;
  count: number;
  dropoffPct: number;
  cumulativePct: number;
}

export async function getFunnelStepCounts(
  funnelId: string,
  steps: FunnelStep[],
  range: DateRange
): Promise<StepCount[]> {
  const counts = await Promise.all(
    steps.map(async (step) => {
      const count = await db.event.count({
        where: {
          funnelStepId: step.id,
          timestamp: { gte: range.from, lte: range.to },
        },
      });
      return { step, count };
    })
  );

  const firstCount = counts[0]?.count ?? 0;

  return counts.map(({ step, count }, i) => {
    const prevCount = i > 0 ? counts[i - 1].count : count;
    const dropoffPct =
      prevCount > 0 ? ((1 - count / prevCount) * 100) : 0;
    const cumulativePct =
      firstCount > 0 ? (count / firstCount) * 100 : 100;

    return {
      id: step.id,
      name: step.name,
      type: step.type,
      order: step.order,
      urlPattern: step.urlPattern,
      count,
      dropoffPct,
      cumulativePct,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Values
// ─────────────────────────────────────────────────────────────────────────────

export interface KpiValue {
  metricId: string;
  name: string;
  value: number;
  formatted: string;
  format: string;
}

export async function getFunnelKpiValues(
  orgId: string,
  funnelId: string,
  metrics: MetricWithRelations[],
  range: DateRange
): Promise<KpiValue[]> {
  const results = await Promise.all(
    metrics.map(async (m) => {
      const value = await evaluateMetric(m, orgId, range, funnelId);
      return {
        metricId: m.id,
        name: m.name,
        value,
        formatted: formatMetricValue(value, m.format),
        format: m.format,
      };
    })
  );
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time Series
// ─────────────────────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  date: string;
  [metricName: string]: string | number;
}

export async function getFunnelTimeSeries(
  orgId: string,
  funnelId: string,
  range: DateRange
): Promise<TimeSeriesPoint[]> {
  // Generate all dates in range
  const dates: string[] = [];
  const current = new Date(range.from);
  while (current <= range.to) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  // Get daily event counts and revenue
  const [eventsByDay, revenueByDay] = await Promise.all([
    db.event.groupBy({
      by: ["timestamp"],
      where: {
        organizationId: orgId,
        funnelId,
        timestamp: { gte: range.from, lte: range.to },
      },
      _count: true,
    }),
    db.payment.groupBy({
      by: ["createdAt"],
      where: {
        organizationId: orgId,
        funnelId,
        status: "succeeded",
        createdAt: { gte: range.from, lte: range.to },
      },
      _sum: { amountCents: true },
    }),
  ]);

  // Bucket events by day
  const eventMap = new Map<string, number>();
  for (const row of eventsByDay) {
    const day = new Date(row.timestamp).toISOString().slice(0, 10);
    eventMap.set(day, (eventMap.get(day) ?? 0) + row._count);
  }

  const revenueMap = new Map<string, number>();
  for (const row of revenueByDay) {
    const day = new Date(row.createdAt).toISOString().slice(0, 10);
    revenueMap.set(
      day,
      (revenueMap.get(day) ?? 0) + (row._sum.amountCents ?? 0) / 100
    );
  }

  return dates.map((date) => ({
    date,
    events: eventMap.get(date) ?? 0,
    revenue: revenueMap.get(date) ?? 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Source Breakdown
// ─────────────────────────────────────────────────────────────────────────────

export interface SourceRow {
  source: string;
  visitors: number;
  leads: number;
  purchases: number;
  revenue: number;
  rpl: number;
}

export async function getFunnelSourceBreakdown(
  orgId: string,
  funnelId: string,
  range: DateRange
): Promise<SourceRow[]> {
  // Get events with session source info for this funnel
  const events = await db.event.findMany({
    where: {
      organizationId: orgId,
      funnelId,
      timestamp: { gte: range.from, lte: range.to },
    },
    select: {
      type: true,
      session: {
        select: { ffSource: true, utmSource: true },
      },
    },
  });

  // Get payments for this funnel
  const payments = await db.payment.findMany({
    where: {
      organizationId: orgId,
      funnelId,
      status: "succeeded",
      createdAt: { gte: range.from, lte: range.to },
    },
    select: {
      amountCents: true,
      contact: {
        select: {
          sessions: {
            select: { ffSource: true, utmSource: true },
            take: 1,
            orderBy: { firstSeen: "asc" },
          },
        },
      },
    },
  });

  const sourceMap = new Map<
    string,
    { visitors: Set<string>; leads: number; purchases: number; revenue: number }
  >();

  function getOrCreate(source: string) {
    if (!sourceMap.has(source)) {
      sourceMap.set(source, {
        visitors: new Set(),
        leads: 0,
        purchases: 0,
        revenue: 0,
      });
    }
    return sourceMap.get(source)!;
  }

  for (const e of events) {
    const src =
      e.session?.ffSource || e.session?.utmSource || "direct";
    const row = getOrCreate(src);
    if (e.type === "PAGE_VIEW") row.visitors.add(src + Math.random());
    if (e.type === "OPT_IN" || e.type === "FORM_SUBMIT") row.leads++;
    if (e.type === "PURCHASE") row.purchases++;
  }

  for (const p of payments) {
    const src =
      p.contact?.sessions?.[0]?.ffSource ||
      p.contact?.sessions?.[0]?.utmSource ||
      "direct";
    const row = getOrCreate(src);
    row.revenue += (p.amountCents ?? 0) / 100;
  }

  return Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      visitors: data.visitors.size,
      leads: data.leads,
      purchases: data.purchases,
      revenue: data.revenue,
      rpl: data.leads > 0 ? data.revenue / data.leads : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}
