import { db } from "@/lib/db";
import { parseDateRange } from "@/lib/dashboard/date-range";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EventFeed } from "@/components/dashboard/event-feed";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Users, DollarSign, Eye, ShoppingCart } from "lucide-react";
import Link from "next/link";

export default async function SourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; source: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { orgId, source: rawSource } = await params;
  const { range } = await searchParams;
  const dateRange = parseDateRange(range ?? null);
  const source = decodeURIComponent(rawSource);

  // Get sessions for this source
  const sessions = await db.session.findMany({
    where: {
      organizationId: orgId,
      OR: [{ ffSource: source }, { utmSource: source }],
      firstSeen: { gte: dateRange.from, lte: dateRange.to },
    },
    select: {
      id: true,
      contactId: true,
    },
  });

  const sessionIds = sessions.map((s) => s.id);
  const contactIds = [
    ...new Set(sessions.filter((s) => s.contactId).map((s) => s.contactId!)),
  ];

  // Get KPI data in parallel
  const [
    visitors,
    leads,
    purchases,
    revenue,
    contacts,
    recentEvents,
  ] = await Promise.all([
    // Visitors count = sessions
    Promise.resolve(sessions.length),
    // Leads from this source
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
    // Purchases from this source
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
    // Revenue from contacts who came from this source
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
    // Contacts from this source
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
    // Recent events from sessions of this source
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

  const rpl = leads > 0 ? revenue / leads : 0;

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
            <span className="text-foreground">{source}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {source}
          </h1>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contacts from this source */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Contacts ({contacts.length})
          </h2>
          {contacts.length === 0 ? (
            <Card className="border-border py-0">
              <div className="p-8 text-center text-sm text-muted-foreground">
                No contacts from this source yet.
              </div>
            </Card>
          ) : (
            <Card className="gap-0 border-border py-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="px-4 text-xs text-muted-foreground">Contact</TableHead>
                    <TableHead className="px-4 text-right text-xs text-muted-foreground">Events</TableHead>
                    <TableHead className="px-4 text-right text-xs text-muted-foreground">Payments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id} className="border-border">
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
                          {contact.email && (contact.firstName || contact.lastName) && (
                            <p className="text-xs text-muted-foreground/60">{contact.email}</p>
                          )}
                        </Link>
                        <div className="mt-1 flex items-center gap-1">
                          {contact.leadQuality && (
                            <Badge variant="secondary" className="text-[10px]">
                              {contact.leadQuality}
                            </Badge>
                          )}
                          {contact.tags?.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary text-[10px]">
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
