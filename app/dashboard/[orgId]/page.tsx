import { DollarSign, Users, Eye, ShoppingCart } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SourceTable } from "@/components/dashboard/source-table";
import { FunnelCard } from "@/components/dashboard/funnel-card";
import { EventFeed } from "@/components/dashboard/event-feed";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { parseDateRange } from "@/lib/dashboard/date-range";
import {
  getKpiMetrics,
  getSourceBreakdown,
  getFunnelOverview,
  getRecentEvents,
} from "@/lib/dashboard/queries";
import { Card } from "@/components/ui/card";

export default async function DashboardOverview({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { orgId } = await params;
  const { range } = await searchParams;
  const dateRange = parseDateRange(range ?? null);

  const [kpis, sources, funnels, events] = await Promise.all([
    getKpiMetrics(orgId, dateRange),
    getSourceBreakdown(orgId, dateRange),
    getFunnelOverview(orgId, dateRange),
    getRecentEvents(orgId, 20),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">Your funnel performance at a glance</p>
        </div>
        <DateRangePicker />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={`$${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${kpis.totalPurchases} sale${kpis.totalPurchases !== 1 ? "s" : ""}`}
          icon={DollarSign}
          color="green"
        />
        <KpiCard
          label="Leads"
          value={kpis.totalLeads.toLocaleString()}
          subtitle={`Rev/Lead: $${kpis.rpl.toFixed(2)}`}
          icon={Users}
          color="blue"
        />
        <KpiCard
          label="Visitors"
          value={kpis.totalVisitors.toLocaleString()}
          subtitle={`Rev/Visitor: $${kpis.rpv.toFixed(2)}`}
          icon={Eye}
          color="accent"
        />
        <KpiCard
          label="Purchases"
          value={kpis.totalPurchases.toLocaleString()}
          subtitle={kpis.totalLeads > 0
            ? `${((kpis.totalPurchases / kpis.totalLeads) * 100).toFixed(1)}% lead → sale`
            : "—"}
          icon={ShoppingCart}
          color="yellow"
        />
      </div>

      {/* Source Breakdown */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Source Performance</h2>
        <SourceTable data={sources} />
      </section>

      {/* Funnels + Live Feed side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnels */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Funnels
            {funnels.length > 0 && (
              <span className="ml-2 text-muted-foreground/60">({funnels.length})</span>
            )}
          </h2>
          {funnels.length === 0 ? (
            <Card className="border-border py-0">
              <div className="p-8 text-center text-sm text-muted-foreground">
                No funnels configured yet. Create one to start tracking conversions.
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {funnels.map((funnel) => (
                <FunnelCard
                  key={funnel.id}
                  id={funnel.id}
                  orgId={orgId}
                  name={funnel.name}
                  type={funnel.type}
                  isActive={funnel.isActive}
                  activeTests={funnel.activeTests}
                  steps={funnel.steps}
                />
              ))}
            </div>
          )}
        </section>

        {/* Live Feed */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent Events</h2>
          <EventFeed
            orgId={orgId}
            events={events.map((e) => ({
              ...e,
              timestamp: e.timestamp.toISOString(),
            }))}
          />
        </section>
      </div>
    </div>
  );
}
