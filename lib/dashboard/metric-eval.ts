import { db } from "@/lib/db";
import type { DateRange } from "./queries";
import type {
  Metric,
  MetricKind,
  MetricAggregation,
  MetricFormat,
} from "@prisma/client";

// Metric with optional relations loaded
export interface MetricWithRelations extends Metric {
  numeratorMetric?: MetricWithRelations | null;
  denominatorMetric?: MetricWithRelations | null;
}

/**
 * Evaluate a single metric and return its numeric value.
 *
 * For EVENT metrics: counts events of the given type.
 * For REVENUE metrics: sums payment amounts.
 * For CALCULATED metrics: evaluates numerator / denominator recursively.
 */
export async function evaluateMetric(
  metric: MetricWithRelations,
  orgId: string,
  range: DateRange,
  funnelId?: string,
  _depth = 0
): Promise<number> {
  // Prevent infinite recursion for circular references
  if (_depth > 3) return 0;

  switch (metric.kind as MetricKind) {
    case "EVENT":
      return evaluateEventMetric(metric, orgId, range, funnelId);
    case "REVENUE":
      return evaluateRevenueMetric(orgId, range, metric.productFilter, funnelId);
    case "CALCULATED":
      return evaluateCalculatedMetric(metric, orgId, range, funnelId, _depth);
    default:
      return 0;
  }
}

/**
 * Evaluate multiple metrics in parallel. Returns a Map of metricId → value.
 */
export async function evaluateMetrics(
  metrics: MetricWithRelations[],
  orgId: string,
  range: DateRange,
  funnelId?: string
): Promise<Map<string, number>> {
  const entries = await Promise.all(
    metrics.map(async (m) => {
      const value = await evaluateMetric(m, orgId, range, funnelId);
      return [m.id, value] as const;
    })
  );
  return new Map(entries);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal evaluation functions
// ─────────────────────────────────────────────────────────────────────────────

async function evaluateEventMetric(
  metric: MetricWithRelations,
  orgId: string,
  range: DateRange,
  funnelId?: string
): Promise<number> {
  if (!metric.eventType) return 0;

  const where: Record<string, unknown> = {
    organizationId: orgId,
    type: metric.eventType,
    timestamp: { gte: range.from, lte: range.to },
  };
  if (funnelId) where.funnelId = funnelId;

  const aggregation = metric.aggregation as MetricAggregation;

  switch (aggregation) {
    case "TOTAL_EVENTS":
      return db.event.count({ where });

    case "UNIQUE_CONTACTS":
      // Count distinct contacts that have events matching criteria
      const grouped = await db.event.groupBy({
        by: ["contactId"],
        where: { ...where, contactId: { not: null } },
      });
      return grouped.length;

    case "EVENT_VALUE_SUM":
    case "EVENT_VALUE_AVG": {
      if (!metric.valueProperty) return 0;
      // Fetch events and aggregate the JSON property in JS
      const events = await db.event.findMany({
        where,
        select: { data: true },
      });
      const values = events
        .map((e) => {
          const data = e.data as Record<string, unknown> | null;
          if (!data || !metric.valueProperty) return null;
          const val = data[metric.valueProperty];
          return typeof val === "number" ? val : null;
        })
        .filter((v): v is number => v !== null);

      if (values.length === 0) return 0;
      const sum = values.reduce((a, b) => a + b, 0);
      return aggregation === "EVENT_VALUE_SUM" ? sum : sum / values.length;
    }

    default:
      return 0;
  }
}

async function evaluateRevenueMetric(
  orgId: string,
  range: DateRange,
  productFilter: string | null,
  funnelId?: string
): Promise<number> {
  const where: Record<string, unknown> = {
    organizationId: orgId,
    status: "succeeded",
    createdAt: { gte: range.from, lte: range.to },
  };
  if (productFilter) where.productName = productFilter;
  if (funnelId) where.funnelId = funnelId;

  const result = await db.payment.aggregate({
    where,
    _sum: { amountCents: true },
  });

  return (result._sum.amountCents ?? 0) / 100;
}

async function evaluateCalculatedMetric(
  metric: MetricWithRelations,
  orgId: string,
  range: DateRange,
  funnelId: string | undefined,
  depth: number
): Promise<number> {
  if (!metric.numeratorMetric || !metric.denominatorMetric) return 0;

  const [numerator, denominator] = await Promise.all([
    evaluateMetric(metric.numeratorMetric, orgId, range, funnelId, depth + 1),
    evaluateMetric(metric.denominatorMetric, orgId, range, funnelId, depth + 1),
  ]);

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Format a metric value for display based on its format type.
 */
export function formatMetricValue(
  value: number,
  format: MetricFormat
): string {
  switch (format) {
    case "CURRENCY":
      return `$${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    case "PERCENTAGE":
      return `${(value * 100).toFixed(1)}%`;
    case "NUMBER":
    default:
      return value.toLocaleString();
  }
}
