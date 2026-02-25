import { db } from "@/lib/db";

/**
 * Seeds default metrics for an organization if none exist.
 * Called on first visit to the Metrics page.
 */
export async function seedDefaultMetrics(orgId: string): Promise<void> {
  const existing = await db.metric.count({
    where: { organizationId: orgId },
  });
  if (existing > 0) return;

  // Create base metrics first
  const visitors = await db.metric.create({
    data: {
      organizationId: orgId,
      name: "Visitors",
      description: "Unique visitors (distinct sessions)",
      kind: "EVENT",
      eventType: "PAGE_VIEW",
      aggregation: "UNIQUE_CONTACTS",
      format: "NUMBER",
    },
  });

  const leads = await db.metric.create({
    data: {
      organizationId: orgId,
      name: "Leads",
      description: "Opt-in and form submission events",
      kind: "EVENT",
      eventType: "OPT_IN",
      aggregation: "TOTAL_EVENTS",
      format: "NUMBER",
    },
  });

  await db.metric.create({
    data: {
      organizationId: orgId,
      name: "Purchases",
      description: "Purchase events",
      kind: "EVENT",
      eventType: "PURCHASE",
      aggregation: "TOTAL_EVENTS",
      format: "NUMBER",
    },
  });

  const revenue = await db.metric.create({
    data: {
      organizationId: orgId,
      name: "Revenue",
      description: "Total revenue from succeeded payments",
      kind: "REVENUE",
      format: "CURRENCY",
    },
  });

  // Create calculated metrics that reference the base ones
  await db.metric.create({
    data: {
      organizationId: orgId,
      name: "RPL",
      description: "Revenue Per Lead",
      kind: "CALCULATED",
      numeratorMetricId: revenue.id,
      denominatorMetricId: leads.id,
      format: "CURRENCY",
    },
  });

  await db.metric.create({
    data: {
      organizationId: orgId,
      name: "Opt-in Rate",
      description: "Leads / Visitors",
      kind: "CALCULATED",
      numeratorMetricId: leads.id,
      denominatorMetricId: visitors.id,
      format: "PERCENTAGE",
    },
  });
}
