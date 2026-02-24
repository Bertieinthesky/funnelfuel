import { db } from "@/lib/db";

export type GroupByDimension = "source" | "tag" | "eventType" | "funnel" | "variant" | "date";

export type MetricKey =
  | "contacts"
  | "sessions"
  | "optIns"
  | "formSubmits"
  | "applications"
  | "bookings"
  | "webinarRegistrations"
  | "webinarAttendees"
  | "purchases"
  | "revenue"
  | "convRate";

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  sources?: string[];
  funnelId?: string;
  experimentId?: string;
  leadQuality?: string;
}

export interface ReportConfig {
  groupBy: GroupByDimension;
  metrics: MetricKey[];
  filters: ReportFilters;
}

export interface ReportRow {
  dimension: string;
  [key: string]: string | number;
}

export interface ReportResult {
  rows: ReportRow[];
  totals: Record<string, number>;
}

const EVENT_METRIC_MAP: Record<string, string> = {
  optIns: "OPT_IN",
  formSubmits: "FORM_SUBMIT",
  applications: "APPLICATION_SUBMIT",
  bookings: "BOOKING_CONFIRMED",
  webinarRegistrations: "WEBINAR_REGISTER",
  webinarAttendees: "WEBINAR_ATTEND",
  purchases: "PURCHASE",
};

export async function getReportResults(
  orgId: string,
  config: ReportConfig
): Promise<ReportResult> {
  const { groupBy, metrics, filters } = config;

  // Date filter
  const dateFilter: Record<string, Date> = {};
  if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
  if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo);
  const hasDate = Object.keys(dateFilter).length > 0;

  // Resolve experiment → variant IDs
  let variantIds: string[] | undefined;
  if (filters.experimentId) {
    const variants = await db.variant.findMany({
      where: { experimentId: filters.experimentId },
      select: { id: true },
    });
    variantIds = variants.map((v) => v.id);
  }

  // Sub-filters for events and payments
  const eventWhere: Record<string, unknown> = {};
  if (hasDate) eventWhere.timestamp = dateFilter;
  if (filters.funnelId) eventWhere.funnelId = filters.funnelId;
  if (variantIds) eventWhere.variantId = { in: variantIds };

  const paymentWhere: Record<string, unknown> = { status: "succeeded" };
  if (hasDate) paymentWhere.createdAt = dateFilter;

  // Contact-level filters
  const contactWhere: Record<string, unknown> = { organizationId: orgId };
  if (filters.tags?.length) contactWhere.tags = { hasSome: filters.tags };
  if (filters.leadQuality) contactWhere.leadQuality = filters.leadQuality;
  if (filters.sources?.length) {
    contactWhere.sessions = {
      some: {
        OR: [
          { ffSource: { in: filters.sources } },
          { utmSource: { in: filters.sources } },
        ],
      },
    };
  }

  // Fetch contacts with related data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contacts = await db.contact.findMany({
    where: contactWhere as any,
    select: {
      id: true,
      tags: true,
      _count: { select: { sessions: true } },
      sessions: {
        select: { ffSource: true, utmSource: true },
        orderBy: { firstSeen: "asc" as const },
        take: 1,
      },
      events: {
        where: eventWhere as any,
        select: {
          type: true,
          variant: { select: { name: true } },
          funnelStep: { select: { funnel: { select: { name: true } } } },
          timestamp: true,
        },
      },
      payments: {
        where: paymentWhere as any,
        select: { amountCents: true },
      },
    },
    take: 10000,
  });

  // Group by chosen dimension
  type EventData = (typeof contacts)[0]["events"][0];
  type PaymentData = (typeof contacts)[0]["payments"][0];

  const groups = new Map<
    string,
    {
      contactIds: Set<string>;
      sessionCount: number;
      events: EventData[];
      payments: PaymentData[];
    }
  >();

  function getOrCreate(key: string) {
    if (!groups.has(key)) {
      groups.set(key, { contactIds: new Set(), sessionCount: 0, events: [], payments: [] });
    }
    return groups.get(key)!;
  }

  for (const contact of contacts) {
    let keys: string[];

    switch (groupBy) {
      case "source": {
        const src =
          contact.sessions[0]?.ffSource || contact.sessions[0]?.utmSource || "direct";
        keys = [src];
        break;
      }
      case "tag":
        keys = contact.tags.length > 0 ? contact.tags : ["(no tags)"];
        break;
      case "eventType": {
        const types = new Set(contact.events.map((e) => e.type));
        keys = types.size > 0 ? Array.from(types) : [];
        break;
      }
      case "funnel": {
        const names = new Set(
          contact.events
            .map((e) => e.funnelStep?.funnel?.name)
            .filter(Boolean) as string[]
        );
        keys = names.size > 0 ? Array.from(names) : ["(no funnel)"];
        break;
      }
      case "variant": {
        const names = new Set(
          contact.events.map((e) => e.variant?.name).filter(Boolean) as string[]
        );
        keys = names.size > 0 ? Array.from(names) : ["(no variant)"];
        break;
      }
      case "date": {
        keys =
          contact.events.length > 0
            ? [
                ...new Set(
                  contact.events.map((e) => e.timestamp.toISOString().split("T")[0])
                ),
              ]
            : [];
        break;
      }
      default:
        keys = ["unknown"];
    }

    for (const key of keys) {
      const group = getOrCreate(key);
      group.contactIds.add(contact.id);
      group.sessionCount += contact._count.sessions;
      group.events.push(...contact.events);
      group.payments.push(...contact.payments);
    }
  }

  // Calculate metrics per group
  const rows: ReportRow[] = [];
  const totals: Record<string, number> = {};
  for (const m of metrics) totals[m] = 0;

  for (const [dimension, group] of groups) {
    const row: ReportRow = { dimension };

    for (const m of metrics) {
      let value = 0;

      if (m === "contacts") {
        value = group.contactIds.size;
      } else if (m === "sessions") {
        value = group.sessionCount;
      } else if (m === "revenue") {
        value = group.payments.reduce((s, p) => s + p.amountCents, 0) / 100;
      } else if (m === "convRate") {
        const purch = group.events.filter((e) => e.type === "PURCHASE").length;
        value =
          group.contactIds.size > 0
            ? Number(((purch / group.contactIds.size) * 100).toFixed(2))
            : 0;
      } else if (EVENT_METRIC_MAP[m]) {
        value = group.events.filter((e) => e.type === EVENT_METRIC_MAP[m]).length;
      }

      row[m] = value;
      if (m !== "convRate") totals[m] = (totals[m] || 0) + value;
    }

    rows.push(row);
  }

  // Overall conv rate
  if (metrics.includes("convRate")) {
    totals.convRate =
      totals.contacts > 0
        ? Number((((totals.purchases || 0) / totals.contacts) * 100).toFixed(2))
        : 0;
  }

  // Sort by first numeric metric descending
  const sortMetric = metrics.find((m) => m !== "convRate") || metrics[0];
  rows.sort((a, b) => (Number(b[sortMetric]) || 0) - (Number(a[sortMetric]) || 0));

  return { rows, totals };
}
