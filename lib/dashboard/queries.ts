import { db } from "@/lib/db";
import { EventType } from "@prisma/client";

export interface DateRange {
  from: Date;
  to: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI METRICS
// ─────────────────────────────────────────────────────────────────────────────

export async function getKpiMetrics(orgId: string, range: DateRange) {
  const [revenue, leads, visitors, purchases] = await Promise.all([
    // Total revenue
    db.payment.aggregate({
      where: {
        organizationId: orgId,
        status: "succeeded",
        createdAt: { gte: range.from, lte: range.to },
      },
      _sum: { amountCents: true },
      _count: true,
    }),
    // Total leads (opt-ins + form submits that created contacts)
    db.event.count({
      where: {
        organizationId: orgId,
        type: { in: [EventType.FORM_SUBMIT, EventType.OPT_IN] },
        timestamp: { gte: range.from, lte: range.to },
      },
    }),
    // Unique visitors (distinct sessions)
    db.session.count({
      where: {
        organizationId: orgId,
        firstSeen: { gte: range.from, lte: range.to },
      },
    }),
    // Purchase count
    db.event.count({
      where: {
        organizationId: orgId,
        type: EventType.PURCHASE,
        timestamp: { gte: range.from, lte: range.to },
      },
    }),
  ]);

  const totalRevenue = (revenue._sum.amountCents ?? 0) / 100;
  const totalLeads = leads;
  const totalVisitors = visitors;
  const totalPurchases = purchases;
  const rpl = totalLeads > 0 ? totalRevenue / totalLeads : 0;
  const rpv = totalVisitors > 0 ? totalRevenue / totalVisitors : 0;

  return { totalRevenue, totalLeads, totalVisitors, totalPurchases, rpl, rpv };
}

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────

export async function getSourceBreakdown(orgId: string, range: DateRange) {
  // Get sessions grouped by source (ffSource or utmSource)
  const sessions = await db.session.findMany({
    where: {
      organizationId: orgId,
      firstSeen: { gte: range.from, lte: range.to },
    },
    select: {
      id: true,
      ffSource: true,
      utmSource: true,
      contactId: true,
    },
  });

  // Get events for these sessions
  const sessionIds = sessions.map((s) => s.id);

  const [events, payments] = await Promise.all([
    db.event.findMany({
      where: {
        organizationId: orgId,
        sessionId: { in: sessionIds },
        timestamp: { gte: range.from, lte: range.to },
      },
      select: { sessionId: true, type: true },
    }),
    db.payment.findMany({
      where: {
        organizationId: orgId,
        contactId: {
          in: sessions.filter((s) => s.contactId).map((s) => s.contactId!),
        },
        status: "succeeded",
        createdAt: { gte: range.from, lte: range.to },
      },
      select: { contactId: true, amountCents: true },
    }),
  ]);

  // Build lookup maps
  const sessionToSource = new Map<string, string>();
  const contactToSource = new Map<string, string>();
  for (const s of sessions) {
    const source = s.ffSource || s.utmSource || "direct";
    sessionToSource.set(s.id, source);
    if (s.contactId) contactToSource.set(s.contactId, source);
  }

  // Aggregate per source
  const sourceMap = new Map<
    string,
    { visitors: number; leads: number; purchases: number; revenue: number }
  >();

  const getSource = (name: string) => {
    if (!sourceMap.has(name))
      sourceMap.set(name, { visitors: 0, leads: 0, purchases: 0, revenue: 0 });
    return sourceMap.get(name)!;
  };

  // Count visitors per source
  for (const s of sessions) {
    const source = sessionToSource.get(s.id) ?? "direct";
    getSource(source).visitors++;
  }

  // Count leads and purchases per source
  for (const e of events) {
    const source = sessionToSource.get(e.sessionId ?? "") ?? "direct";
    if (
      e.type === EventType.FORM_SUBMIT ||
      e.type === EventType.OPT_IN
    ) {
      getSource(source).leads++;
    }
    if (e.type === EventType.PURCHASE) {
      getSource(source).purchases++;
    }
  }

  // Attribute revenue
  for (const p of payments) {
    const source = contactToSource.get(p.contactId ?? "") ?? "direct";
    getSource(source).revenue += p.amountCents / 100;
  }

  return Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      ...data,
      rpl: data.leads > 0 ? data.revenue / data.leads : 0,
      rpv: data.visitors > 0 ? data.revenue / data.visitors : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNNEL OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export async function getFunnelOverview(orgId: string, range: DateRange) {
  const funnels = await db.funnel.findMany({
    where: { organizationId: orgId },
    include: {
      steps: { orderBy: { order: "asc" } },
      experiments: {
        where: { status: "ACTIVE" },
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const funnelData = await Promise.all(
    funnels.map(async (funnel) => {
      const stepData = await Promise.all(
        funnel.steps.map(async (step) => {
          const count = await db.event.count({
            where: {
              funnelStepId: step.id,
              timestamp: { gte: range.from, lte: range.to },
            },
          });
          return { id: step.id, name: step.name, type: step.type, order: step.order, count };
        })
      );

      return {
        id: funnel.id,
        name: funnel.name,
        type: funnel.type,
        isActive: funnel.isActive,
        activeTests: funnel.experiments.length,
        steps: stepData,
      };
    })
  );

  return funnelData;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE EVENT FEED
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecentEvents(
  orgId: string,
  limit: number = 50,
  eventTypes?: EventType[]
) {
  return db.event.findMany({
    where: {
      organizationId: orgId,
      ...(eventTypes?.length ? { type: { in: eventTypes } } : {}),
    },
    select: {
      id: true,
      type: true,
      source: true,
      confidence: true,
      data: true,
      timestamp: true,
      contact: { select: { email: true, firstName: true, lastName: true } },
      session: { select: { ffSource: true, utmSource: true, landingPage: true } },
    },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SPLIT TEST OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export async function getSplitTestOverview(orgId: string, range: DateRange) {
  const experiments = await db.experiment.findMany({
    where: { organizationId: orgId },
    include: {
      variants: true,
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const results = await Promise.all(
    experiments.map(async (exp) => {
      const variantData = await Promise.all(
        exp.variants.map(async (v) => {
          const [assignments, conversions, revenue] = await Promise.all([
            db.experimentAssignment.count({
              where: {
                variantId: v.id,
                assignedAt: { gte: range.from, lte: range.to },
              },
            }),
            db.event.count({
              where: {
                variantId: v.id,
                type: { in: [EventType.PURCHASE, EventType.FORM_SUBMIT, EventType.OPT_IN] },
                timestamp: { gte: range.from, lte: range.to },
              },
            }),
            db.payment.aggregate({
              where: {
                variantId: v.id,
                status: "succeeded",
                createdAt: { gte: range.from, lte: range.to },
              },
              _sum: { amountCents: true },
            }),
          ]);

          return {
            id: v.id,
            name: v.name,
            url: v.url,
            weight: v.weight,
            visitors: assignments,
            conversions,
            revenue: (revenue._sum.amountCents ?? 0) / 100,
            conversionRate: assignments > 0 ? (conversions / assignments) * 100 : 0,
          };
        })
      );

      return {
        id: exp.id,
        name: exp.name,
        slug: exp.slug,
        status: exp.status,
        totalAssignments: exp._count.assignments,
        variants: variantData,
      };
    })
  );

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS LIST
// ─────────────────────────────────────────────────────────────────────────────

export async function getContacts(
  orgId: string,
  page: number = 1,
  limit: number = 50
) {
  const [contacts, total] = await Promise.all([
    db.contact.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        leadQuality: true,
        createdAt: true,
        _count: { select: { events: true, sessions: true, payments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.contact.count({ where: { organizationId: orgId } }),
  ]);

  return { contacts, total, page, totalPages: Math.ceil(total / limit) };
}
