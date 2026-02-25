import { db } from "@/lib/db";
import { EventType } from "@prisma/client";
import { parseDateRange } from "@/lib/dashboard/date-range";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EventFeed } from "@/components/dashboard/event-feed";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  Users,
  DollarSign,
  Eye,
  ShoppingCart,
  X,
} from "lucide-react";
import Link from "next/link";

export default async function SourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; source: string }>;
  searchParams: Promise<{ range?: string; title?: string }>;
}) {
  const { orgId, source: rawSource } = await params;
  const { range, title: activeTitle } = await searchParams;
  const dateRange = parseDateRange(range ?? null);
  const source = decodeURIComponent(rawSource);

  // Get sessions for this source (with title data)
  const sessions = await db.session.findMany({
    where: {
      organizationId: orgId,
      OR: [{ ffSource: source }, { utmSource: source }],
      firstSeen: { gte: dateRange.from, lte: dateRange.to },
      ...(activeTitle ? { ffTitle: activeTitle } : {}),
    },
    select: {
      id: true,
      contactId: true,
      ffTitle: true,
    },
  });

  const sessionIds = sessions.map((s) => s.id);
  const contactIds = [
    ...new Set(
      sessions.filter((s) => s.contactId).map((s) => s.contactId!)
    ),
  ];

  // Also fetch ALL sessions for this source (without title filter) to build title breakdown
  const allSessions = activeTitle
    ? await db.session.findMany({
        where: {
          organizationId: orgId,
          OR: [{ ffSource: source }, { utmSource: source }],
          firstSeen: { gte: dateRange.from, lte: dateRange.to },
        },
        select: { id: true, contactId: true, ffTitle: true },
      })
    : sessions;

  // Build title breakdown from all sessions
  const allSessionIds = allSessions.map((s) => s.id);
  const allContactIds = [
    ...new Set(
      allSessions.filter((s) => s.contactId).map((s) => s.contactId!)
    ),
  ];

  // Get events and payments for title breakdown
  const [allEvents, allPayments] = await Promise.all([
    allSessionIds.length > 0
      ? db.event.findMany({
          where: {
            organizationId: orgId,
            sessionId: { in: allSessionIds },
            timestamp: { gte: dateRange.from, lte: dateRange.to },
          },
          select: { sessionId: true, type: true },
        })
      : [],
    allContactIds.length > 0
      ? db.payment.findMany({
          where: {
            organizationId: orgId,
            contactId: { in: allContactIds },
            status: "succeeded",
            createdAt: { gte: dateRange.from, lte: dateRange.to },
          },
          select: { contactId: true, amountCents: true },
        })
      : [],
  ]);

  // Build session→title map for title breakdown
  const sessionTitleMap = new Map<string, string>();
  const sessionContactMap = new Map<string, string | null>();
  for (const s of allSessions) {
    sessionTitleMap.set(s.id, s.ffTitle || "");
    sessionContactMap.set(s.id, s.contactId);
  }

  // Map contacts to their title via session
  const contactTitleMap = new Map<string, string>();
  for (const s of allSessions) {
    if (s.contactId && s.ffTitle) {
      contactTitleMap.set(s.contactId, s.ffTitle);
    }
  }

  // Aggregate per title
  type TitleBucket = {
    visitors: number;
    leads: number;
    purchases: number;
    revenue: number;
  };
  const titleBuckets = new Map<string, TitleBucket>();
  const getOrCreate = (title: string) => {
    if (!titleBuckets.has(title))
      titleBuckets.set(title, {
        visitors: 0,
        leads: 0,
        purchases: 0,
        revenue: 0,
      });
    return titleBuckets.get(title)!;
  };

  for (const s of allSessions) {
    const title = s.ffTitle || "(no title)";
    getOrCreate(title).visitors++;
  }

  for (const e of allEvents) {
    const title =
      sessionTitleMap.get(e.sessionId ?? "") || "(no title)";
    if (
      e.type === EventType.FORM_SUBMIT ||
      e.type === EventType.OPT_IN
    ) {
      getOrCreate(title).leads++;
    }
    if (e.type === EventType.PURCHASE) {
      getOrCreate(title).purchases++;
    }
  }

  for (const p of allPayments) {
    const title =
      contactTitleMap.get(p.contactId ?? "") || "(no title)";
    getOrCreate(title).revenue += p.amountCents / 100;
  }

  const titles = Array.from(titleBuckets.entries())
    .map(([title, data]) => ({ title, ...data }))
    .sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);

  // Now get KPIs, contacts, and events for the filtered view (respects title filter)
  const [leads, purchases, revenue, contacts, recentEvents] =
    await Promise.all([
      sessionIds.length > 0
        ? db.event.count({
            where: {
              organizationId: orgId,
              sessionId: { in: sessionIds },
              type: { in: ["FORM_SUBMIT", "OPT_IN"] },
              timestamp: { gte: dateRange.from, lte: dateRange.to },
            },
          })
        : 0,
      sessionIds.length > 0
        ? db.event.count({
            where: {
              organizationId: orgId,
              sessionId: { in: sessionIds },
              type: "PURCHASE",
              timestamp: { gte: dateRange.from, lte: dateRange.to },
            },
          })
        : 0,
      contactIds.length > 0
        ? db.payment
            .aggregate({
              where: {
                organizationId: orgId,
                contactId: { in: contactIds },
                status: "succeeded",
                createdAt: { gte: dateRange.from, lte: dateRange.to },
              },
              _sum: { amountCents: true },
            })
            .then((r) => (r._sum.amountCents ?? 0) / 100)
        : 0,
      contactIds.length > 0
        ? db.contact.findMany({
            where: {
              organizationId: orgId,
              id: { in: contactIds },
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              leadQuality: true,
              tags: true,
              createdAt: true,
              _count: { select: { events: true, payments: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : [],
      sessionIds.length > 0
        ? db.event.findMany({
            where: {
              organizationId: orgId,
              sessionId: { in: sessionIds },
              timestamp: { gte: dateRange.from, lte: dateRange.to },
            },
            select: {
              id: true,
              type: true,
              source: true,
              confidence: true,
              data: true,
              timestamp: true,
              contactId: true,
              contact: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  leadQuality: true,
                  tags: true,
                },
              },
              session: {
                select: {
                  ffSource: true,
                  utmSource: true,
                  landingPage: true,
                },
              },
            },
            orderBy: { timestamp: "desc" },
            take: 50,
          })
        : [],
    ]);

  const visitors = sessions.length;
  const rpl = leads > 0 ? revenue / leads : 0;

  // Build URL helper for title links
  const basePath = `/dashboard/${orgId}/sources/${encodeURIComponent(source)}`;
  function titleUrl(title: string) {
    const params = new URLSearchParams();
    if (range) params.set("range", range);
    if (title !== "(no title)") params.set("title", title);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/dashboard/${orgId}/sources`}
              className="transition-colors hover:text-foreground"
            >
              Sources
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link
              href={basePath + (range ? `?range=${range}` : "")}
              className={cn(
                "transition-colors",
                activeTitle
                  ? "hover:text-foreground"
                  : "text-foreground"
              )}
            >
              {source}
            </Link>
            {activeTitle && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">{activeTitle}</span>
              </>
            )}
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {activeTitle ? activeTitle : source}
          </h1>
          {activeTitle && (
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                Source: {source}
              </Badge>
              <Link
                href={basePath + (range ? `?range=${range}` : "")}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear title filter
              </Link>
            </div>
          )}
        </div>
        <DateRangePicker />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          label="Visitors"
          value={visitors.toLocaleString()}
          icon={Eye}
          color="accent"
        />
        <KpiCard
          label="Leads"
          value={leads.toLocaleString()}
          icon={Users}
          color="blue"
        />
        <KpiCard
          label="Purchases"
          value={purchases.toLocaleString()}
          icon={ShoppingCart}
          color="yellow"
        />
        <KpiCard
          label="Revenue"
          value={`$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="green"
        />
        <KpiCard
          label="Rev/Lead"
          value={`$${rpl.toFixed(2)}`}
          icon={DollarSign}
          color="green"
        />
      </div>

      {/* Title Breakdown */}
      {titles.length > 1 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Titles ({titles.length})
          </h2>
          <Card className="gap-0 border-border py-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="px-4 text-xs text-muted-foreground">
                    Title
                  </TableHead>
                  <TableHead className="px-4 text-right text-xs text-muted-foreground">
                    Visitors
                  </TableHead>
                  <TableHead className="px-4 text-right text-xs text-muted-foreground">
                    Leads
                  </TableHead>
                  <TableHead className="px-4 text-right text-xs text-muted-foreground">
                    Purchases
                  </TableHead>
                  <TableHead className="px-4 text-right text-xs text-muted-foreground">
                    Revenue
                  </TableHead>
                  <TableHead className="px-4 text-right text-xs text-muted-foreground">
                    RPL
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {titles.map((t) => {
                  const isActive = activeTitle === t.title;
                  const tRpl =
                    t.leads > 0 ? t.revenue / t.leads : 0;
                  return (
                    <TableRow
                      key={t.title}
                      className={cn(
                        "border-border",
                        isActive && "bg-primary/5"
                      )}
                    >
                      <TableCell className="px-4">
                        <Link
                          href={titleUrl(t.title)}
                          className={cn(
                            "text-sm transition-colors hover:text-primary",
                            isActive
                              ? "font-medium text-primary"
                              : "text-foreground"
                          )}
                        >
                          {t.title}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                        {t.visitors.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                        {t.leads.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                        {t.purchases.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 text-right tabular-nums text-green">
                        $
                        {t.revenue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                        ${tRpl.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contacts */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Contacts ({contacts.length})
            {activeTitle && (
              <span className="ml-1 text-muted-foreground/60">
                from &quot;{activeTitle}&quot;
              </span>
            )}
          </h2>
          {contacts.length === 0 ? (
            <Card className="border-border py-0">
              <div className="p-8 text-center text-sm text-muted-foreground">
                No contacts from this{" "}
                {activeTitle ? "title" : "source"} yet.
              </div>
            </Card>
          ) : (
            <Card className="gap-0 border-border py-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="px-4 text-xs text-muted-foreground">
                      Contact
                    </TableHead>
                    <TableHead className="px-4 text-right text-xs text-muted-foreground">
                      Events
                    </TableHead>
                    <TableHead className="px-4 text-right text-xs text-muted-foreground">
                      Payments
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="border-border"
                    >
                      <TableCell className="px-4">
                        <Link
                          href={`/dashboard/${orgId}/contacts/${contact.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          <p className="text-sm font-medium text-foreground">
                            {contact.firstName || contact.lastName
                              ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
                              : contact.email ?? "Anonymous"}
                          </p>
                          {contact.email &&
                            (contact.firstName ||
                              contact.lastName) && (
                              <p className="text-xs text-muted-foreground/60">
                                {contact.email}
                              </p>
                            )}
                        </Link>
                        <div className="mt-1 flex items-center gap-1">
                          {contact.leadQuality && (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {contact.leadQuality}
                            </Badge>
                          )}
                          {contact.tags?.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="bg-primary/10 text-primary text-[10px]"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                        {contact._count.events}
                      </TableCell>
                      <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                        {contact._count.payments}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </section>

        {/* Events feed */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Recent Events
            {activeTitle && (
              <span className="ml-1 text-muted-foreground/60">
                from &quot;{activeTitle}&quot;
              </span>
            )}
          </h2>
          <EventFeed
            orgId={orgId}
            events={recentEvents.map((e) => ({
              ...e,
              timestamp: e.timestamp.toISOString(),
            }))}
          />
        </section>
      </div>
    </div>
  );
}
