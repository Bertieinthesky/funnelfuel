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
  // Get sessions grouped by source (ffSource or utmSource) + title
  const sessions = await db.session.findMany({
    where: {
      organizationId: orgId,
      firstSeen: { gte: range.from, lte: range.to },
    },
    select: {
      id: true,
      ffSource: true,
      ffTitle: true,
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

  // Build lookup maps: session → source, session → title
  const sessionToSource = new Map<string, string>();
  const sessionToTitle = new Map<string, string>();
  const contactToSource = new Map<string, string>();
  const contactToTitle = new Map<string, string>();
  for (const s of sessions) {
    const source = s.ffSource || s.utmSource || "direct";
    const title = s.ffTitle || "";
    sessionToSource.set(s.id, source);
    sessionToTitle.set(s.id, title);
    if (s.contactId) {
      contactToSource.set(s.contactId, source);
      contactToTitle.set(s.contactId, title);
    }
  }

  // Aggregate per source AND per source+title
  type Bucket = { visitors: number; leads: number; purchases: number; revenue: number };
  const sourceMap = new Map<string, Bucket>();
  const titleMap = new Map<string, Map<string, Bucket>>();

  const getBucket = (map: Map<string, Bucket>, key: string) => {
    if (!map.has(key))
      map.set(key, { visitors: 0, leads: 0, purchases: 0, revenue: 0 });
    return map.get(key)!;
  };

  const getTitleBucket = (source: string, title: string) => {
    if (!titleMap.has(source)) titleMap.set(source, new Map());
    return getBucket(titleMap.get(source)!, title);
  };

  // Count visitors per source + title
  for (const s of sessions) {
    const source = sessionToSource.get(s.id) ?? "direct";
    const title = sessionToTitle.get(s.id) ?? "";
    getBucket(sourceMap, source).visitors++;
    if (title) getTitleBucket(source, title).visitors++;
  }

  // Count leads and purchases per source + title
  for (const e of events) {
    const source = sessionToSource.get(e.sessionId ?? "") ?? "direct";
    const title = sessionToTitle.get(e.sessionId ?? "") ?? "";
    if (
      e.type === EventType.FORM_SUBMIT ||
      e.type === EventType.OPT_IN
    ) {
      getBucket(sourceMap, source).leads++;
      if (title) getTitleBucket(source, title).leads++;
    }
    if (e.type === EventType.PURCHASE) {
      getBucket(sourceMap, source).purchases++;
      if (title) getTitleBucket(source, title).purchases++;
    }
  }

  // Attribute revenue per source + title
  for (const p of payments) {
    const source = contactToSource.get(p.contactId ?? "") ?? "direct";
    const title = contactToTitle.get(p.contactId ?? "") ?? "";
    getBucket(sourceMap, source).revenue += p.amountCents / 100;
    if (title) getTitleBucket(source, title).revenue += p.amountCents / 100;
  }

  return Array.from(sourceMap.entries())
    .map(([source, data]) => {
      const titlesInner = titleMap.get(source);
      const titles = titlesInner
        ? Array.from(titlesInner.entries())
            .map(([title, td]) => ({
              title,
              ...td,
              rpl: td.leads > 0 ? td.revenue / td.leads : 0,
              rpv: td.visitors > 0 ? td.revenue / td.visitors : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue)
        : [];

      return {
        source,
        ...data,
        rpl: data.leads > 0 ? data.revenue / data.leads : 0,
        rpv: data.visitors > 0 ? data.revenue / data.visitors : 0,
        titles,
      };
    })
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

  const funnelIds = funnels.map((f) => f.id);

  // Batch: single groupBy query for all step counts instead of N+1
  const allStepIds = funnels.flatMap((f) => f.steps.map((s) => s.id));

  // Today's date boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Health: last 7 days vs prior 7 days boundaries
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [stepCounts, todayEvents, todayRevenue, healthCurrent, healthPrevious] = await Promise.all([
    allStepIds.length > 0
      ? db.event.groupBy({
          by: ["funnelStepId"],
          where: {
            funnelStepId: { in: allStepIds },
            timestamp: { gte: range.from, lte: range.to },
          },
          _count: true,
        })
      : Promise.resolve([]),
    // Today's event counts per funnel
    funnelIds.length > 0
      ? db.event.groupBy({
          by: ["funnelId"],
          where: {
            funnelId: { in: funnelIds },
            timestamp: { gte: todayStart, lte: todayEnd },
          },
          _count: true,
        })
      : Promise.resolve([]),
    // Today's revenue per funnel
    funnelIds.length > 0
      ? db.payment.groupBy({
          by: ["funnelId"],
          where: {
            funnelId: { in: funnelIds },
            status: "succeeded",
            createdAt: { gte: todayStart, lte: todayEnd },
          },
          _sum: { amountCents: true },
        })
      : Promise.resolve([]),
    // Health: current week step counts
    allStepIds.length > 0
      ? db.event.groupBy({
          by: ["funnelStepId"],
          where: {
            funnelStepId: { in: allStepIds },
            timestamp: { gte: sevenDaysAgo, lte: now },
          },
          _count: true,
        })
      : Promise.resolve([]),
    // Health: previous week step counts
    allStepIds.length > 0
      ? db.event.groupBy({
          by: ["funnelStepId"],
          where: {
            funnelStepId: { in: allStepIds },
            timestamp: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
          _count: true,
        })
      : Promise.resolve([]),
  ]);

  const countMap = new Map(
    stepCounts.map((sc) => [sc.funnelStepId, sc._count])
  );
  const todayEventsMap = new Map(
    todayEvents.map((te) => [te.funnelId, te._count])
  );
  const todayRevenueMap = new Map(
    todayRevenue.map((tr) => [tr.funnelId, (tr._sum.amountCents ?? 0) / 100])
  );
  const healthCurrentMap = new Map(
    healthCurrent.map((hc) => [hc.funnelStepId, hc._count])
  );
  const healthPreviousMap = new Map(
    healthPrevious.map((hp) => [hp.funnelStepId, hp._count])
  );

  type HealthLevel = "healthy" | "warning" | "critical" | "inactive";

  return funnels.map((funnel) => {
    // Compute per-step health for this funnel
    let overallHealth: HealthLevel = "healthy";

    for (const step of funnel.steps) {
      const cur = healthCurrentMap.get(step.id) ?? 0;
      const prev = healthPreviousMap.get(step.id) ?? 0;
      let stepHealth: HealthLevel;

      if (cur === 0 && prev === 0) {
        stepHealth = "inactive";
      } else if (cur === 0 && prev > 0) {
        stepHealth = "critical";
      } else if (prev > 0 && ((cur - prev) / prev) * 100 < -30) {
        stepHealth = "critical";
      } else if (prev > 0 && ((cur - prev) / prev) * 100 < -10) {
        stepHealth = "warning";
      } else {
        stepHealth = "healthy";
      }

      if (stepHealth === "critical") overallHealth = "critical";
      else if (stepHealth === "warning" && overallHealth !== "critical")
        overallHealth = "warning";
      else if (stepHealth === "inactive" && overallHealth === "healthy")
        overallHealth = "inactive";
    }

    return {
      id: funnel.id,
      name: funnel.name,
      type: funnel.type,
      status: funnel.status,
      activeTests: funnel.experiments.length,
      todayEvents: todayEventsMap.get(funnel.id) ?? 0,
      todayRevenue: todayRevenueMap.get(funnel.id) ?? 0,
      health: funnel.steps.length > 0 ? overallHealth : ("inactive" as HealthLevel),
      steps: funnel.steps.map((step) => ({
        id: step.id,
        name: step.name,
        type: step.type,
        order: step.order,
        count: countMap.get(step.id) ?? 0,
      })),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE EVENT FEED
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecentEvents(
  orgId: string,
  limit: number = 50,
  eventTypes?: EventType[],
  funnelId?: string
) {
  return db.event.findMany({
    where: {
      organizationId: orgId,
      ...(eventTypes?.length ? { type: { in: eventTypes } } : {}),
      ...(funnelId ? { funnelId } : {}),
    },
    select: {
      id: true,
      type: true,
      source: true,
      confidence: true,
      data: true,
      timestamp: true,
      contactId: true,
      contact: { select: { email: true, firstName: true, lastName: true, phone: true, leadQuality: true, tags: true } },
      session: { select: { ffSource: true, utmSource: true, landingPage: true } },
      funnelStep: { select: { name: true } },
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

export interface ContactFilters {
  search?: string;
  source?: string;
  title?: string;
  tag?: string;
  eventType?: EventType;
  leadQuality?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function getContacts(
  orgId: string,
  page: number = 1,
  limit: number = 50,
  filters: ContactFilters = {}
) {
  // Build the where clause for contacts
  const where: Record<string, unknown> = { organizationId: orgId };

  // Search by name, email, or phone
  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { email: { contains: term, mode: "insensitive" } },
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { phone: { contains: term } },
    ];
  }

  if (filters.leadQuality) {
    where.leadQuality = filters.leadQuality;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }

  // Tag filter
  if (filters.tag) {
    where.tags = { has: filters.tag };
  }

  // Source/title filter: contacts who have a session with that source/title
  if (filters.source || filters.title) {
    where.sessions = {
      some: {
        ...(filters.source ? { ffSource: filters.source } : {}),
        ...(filters.title ? { ffTitle: filters.title } : {}),
      },
    };
  }

  // Event type filter: contacts who have an event of that type
  if (filters.eventType) {
    where.events = { some: { type: filters.eventType } };
  }

  const [contacts, total] = await Promise.all([
    db.contact.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        leadQuality: true,
        tags: true,
        createdAt: true,
        _count: { select: { events: true, sessions: true, payments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.contact.count({ where }),
  ]);

  return { contacts, total, page, totalPages: Math.ceil(total / limit) };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT DETAIL + JOURNEY
// ─────────────────────────────────────────────────────────────────────────────

export async function getContactDetail(orgId: string, contactId: string) {
  const contact = await db.contact.findFirst({
    where: { id: contactId, organizationId: orgId },
    include: {
      identitySignals: {
        select: { type: true, rawValue: true, confidence: true, firstSeen: true },
        orderBy: { firstSeen: "desc" },
      },
      _count: { select: { events: true, sessions: true, payments: true } },
    },
  });

  if (!contact) return null;

  // Get total revenue
  const revenue = await db.payment.aggregate({
    where: { contactId, organizationId: orgId, status: "succeeded" },
    _sum: { amountCents: true },
    _count: true,
  });

  return {
    ...contact,
    totalRevenue: (revenue._sum.amountCents ?? 0) / 100,
    totalPayments: revenue._count,
  };
}

export async function getContactJourney(orgId: string, contactId: string) {
  // Fetch all journey data in parallel
  const [sessions, events, pageViews, payments] = await Promise.all([
    db.session.findMany({
      where: { contactId, organizationId: orgId },
      select: {
        id: true,
        sessionKey: true,
        ffSource: true,
        ffTitle: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmContent: true,
        utmTerm: true,
        referrer: true,
        landingPage: true,
        ip: true,
        userAgent: true,
        adClicks: true,
        firstSeen: true,
        lastSeen: true,
        visitCount: true,
      },
      orderBy: { firstSeen: "desc" },
    }),
    db.event.findMany({
      where: { contactId, organizationId: orgId },
      select: {
        id: true,
        type: true,
        source: true,
        confidence: true,
        data: true,
        timestamp: true,
        sessionId: true,
        variant: { select: { name: true, experiment: { select: { name: true } } } },
        funnelStep: { select: { name: true, funnel: { select: { name: true } } } },
      },
      orderBy: { timestamp: "desc" },
    }),
    db.pageView.findMany({
      where: { contactId },
      select: {
        id: true,
        url: true,
        path: true,
        title: true,
        timestamp: true,
        sessionId: true,
      },
      orderBy: { timestamp: "desc" },
      take: 200,
    }),
    db.payment.findMany({
      where: { contactId, organizationId: orgId },
      select: {
        id: true,
        amountCents: true,
        currency: true,
        processor: true,
        productName: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Build unified timeline
  type TimelineItem = {
    id: string;
    type: "session" | "event" | "page_view" | "payment";
    timestamp: Date;
    data: Record<string, unknown>;
  };

  const timeline: TimelineItem[] = [];

  for (const s of sessions) {
    timeline.push({
      id: `session-${s.id}`,
      type: "session",
      timestamp: s.firstSeen,
      data: {
        sessionId: s.id,
        source: s.ffSource || s.utmSource || "direct",
        title: s.ffTitle,
        medium: s.utmMedium,
        campaign: s.utmCampaign,
        referrer: s.referrer,
        landingPage: s.landingPage,
        adClicks: s.adClicks,
        visitCount: s.visitCount,
      },
    });
  }

  for (const e of events) {
    timeline.push({
      id: `event-${e.id}`,
      type: "event",
      timestamp: e.timestamp,
      data: {
        eventType: e.type,
        source: e.source,
        confidence: e.confidence,
        details: e.data,
        variant: e.variant?.name,
        experiment: e.variant?.experiment?.name,
        funnelStep: e.funnelStep?.name,
        funnel: e.funnelStep?.funnel?.name,
      },
    });
  }

  for (const pv of pageViews) {
    timeline.push({
      id: `pv-${pv.id}`,
      type: "page_view",
      timestamp: pv.timestamp,
      data: {
        url: pv.url,
        path: pv.path,
        title: pv.title,
        sessionId: pv.sessionId,
      },
    });
  }

  for (const p of payments) {
    timeline.push({
      id: `payment-${p.id}`,
      type: "payment",
      timestamp: p.createdAt,
      data: {
        amount: p.amountCents / 100,
        currency: p.currency,
        processor: p.processor,
        product: p.productName,
        status: p.status,
      },
    });
  }

  // Sort by timestamp descending (newest first)
  timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return { sessions, events, pageViews, payments, timeline };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER OPTIONS (for dropdowns)
// ─────────────────────────────────────────────────────────────────────────────

export async function getFilterOptions(orgId: string) {
  const [sources, titles, tagResults, funnels, experiments] = await Promise.all([
    db.session.findMany({
      where: { organizationId: orgId, ffSource: { not: null } },
      select: { ffSource: true },
      distinct: ["ffSource"],
    }),
    db.session.findMany({
      where: { organizationId: orgId, ffTitle: { not: null } },
      select: { ffTitle: true },
      distinct: ["ffTitle"],
    }),
    db.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) as tag
      FROM contacts
      WHERE "organizationId" = ${orgId}
      ORDER BY tag
    `,
    db.funnel.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.experiment.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    sources: sources.map((s) => s.ffSource!).filter(Boolean),
    titles: titles.map((t) => t.ffTitle!).filter(Boolean),
    tags: tagResults.map((t) => t.tag),
    funnels: funnels.map((f) => ({ id: f.id, name: f.name })),
    experiments: experiments.map((e) => ({ id: e.id, name: e.name })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS PER DAY (for chart)
// ─────────────────────────────────────────────────────────────────────────────

export interface ContactsPerDayFilters {
  eventType?: EventType;
  tag?: string;
  source?: string;
}

export async function getContactsPerDay(
  orgId: string,
  days: number,
  filters: ContactsPerDayFilters = {}
): Promise<{ date: string; count: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, unknown> = {
    organizationId: orgId,
    createdAt: { gte: since },
  };

  if (filters.eventType) {
    where.events = { some: { type: filters.eventType } };
  }

  if (filters.tag) {
    where.tags = { has: filters.tag };
  }

  if (filters.source) {
    where.sessions = {
      some: {
        OR: [
          { ffSource: filters.source },
          { utmSource: filters.source },
        ],
      },
    };
  }

  const contacts = await db.contact.findMany({
    where: where as any,
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Pre-fill all dates in range with 0
  const counts = new Map<string, number>();
  const current = new Date(since);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  while (current <= today) {
    counts.set(current.toISOString().split("T")[0], 0);
    current.setDate(current.getDate() + 1);
  }

  for (const contact of contacts) {
    const dateKey = contact.createdAt.toISOString().split("T")[0];
    counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
