import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { parseDateRange } from "@/lib/dashboard/date-range";
import {
  getFunnelStepCounts,
  getFunnelKpiValues,
} from "@/lib/dashboard/funnel-detail";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { FunnelDetailTable } from "@/components/dashboard/funnel-detail-table";
import { FunnelKpiConfig } from "@/components/dashboard/funnel-kpi-config";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  GitBranch,
  Users,
  UserPlus,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Eye,
} from "lucide-react";
import Link from "next/link";

// Default metric names to show when no FunnelKpi records exist
const DEFAULT_KPI_NAMES: Record<string, string[]> = {
  LOW_TICKET: ["Visitors", "Leads", "Purchases", "Revenue", "RPL"],
  WEBINAR: [
    "Visitors",
    "Leads",
    "Purchases",
    "Revenue",
    "RPL",
    "Opt-in Rate",
  ],
  VSL_APPLICATION: ["Visitors", "Leads", "Purchases", "Revenue", "RPL"],
  WORKSHOP: ["Visitors", "Leads", "Purchases", "Revenue", "RPL"],
  CUSTOM: ["Visitors", "Leads", "Revenue"],
};

// Map metric names to icons for KpiCard
const METRIC_ICONS: Record<string, typeof Users> = {
  Visitors: Eye,
  Leads: UserPlus,
  Purchases: ShoppingCart,
  Revenue: DollarSign,
  RPL: TrendingUp,
  "Opt-in Rate": TrendingUp,
};

// Cycle colors for KPI cards
const KPI_COLORS: ("accent" | "green" | "blue" | "yellow")[] = [
  "accent",
  "green",
  "blue",
  "yellow",
];

export default async function FunnelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; funnelId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { orgId, funnelId } = await params;
  const { range } = await searchParams;
  const dateRange = parseDateRange(range ?? null);

  const funnel = await db.funnel.findFirst({
    where: { id: funnelId, organizationId: orgId },
    include: {
      steps: { orderBy: { order: "asc" } },
      experiments: {
        where: { status: "ACTIVE" },
        include: { variants: true },
      },
      kpis: {
        orderBy: { order: "asc" },
        include: {
          metric: {
            include: {
              numeratorMetric: true,
              denominatorMetric: true,
            },
          },
        },
      },
    },
  });

  if (!funnel) notFound();

  // Get step counts
  const stepCounts = await getFunnelStepCounts(
    funnelId,
    funnel.steps,
    dateRange
  );

  // Determine which metrics to show as KPIs
  let kpiMetrics = funnel.kpis.map((k) => k.metric);

  // If no KPIs configured, use defaults based on funnel type
  if (kpiMetrics.length === 0) {
    const defaultNames =
      DEFAULT_KPI_NAMES[funnel.type] ?? DEFAULT_KPI_NAMES.CUSTOM;
    const orgMetrics = await db.metric.findMany({
      where: { organizationId: orgId, name: { in: defaultNames } },
      include: { numeratorMetric: true, denominatorMetric: true },
    });
    // Sort by the order in defaultNames
    kpiMetrics = defaultNames
      .map((name) => orgMetrics.find((m) => m.name === name))
      .filter(
        (m): m is NonNullable<typeof m> => m !== undefined && m !== null
      );
  }

  // Evaluate KPI values
  const kpiValues = await getFunnelKpiValues(
    orgId,
    funnelId,
    kpiMetrics,
    dateRange
  );

  // All org metrics for KPI config dialog
  const allMetrics = await db.metric.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true, format: true },
  });

  // Get variant performance for active experiments
  const experimentData = await Promise.all(
    funnel.experiments.map(async (exp) => {
      const variantData = await Promise.all(
        exp.variants.map(async (v) => {
          const [assignments, conversions, revenue] = await Promise.all([
            db.experimentAssignment.count({
              where: {
                variantId: v.id,
                assignedAt: { gte: dateRange.from, lte: dateRange.to },
              },
            }),
            db.event.count({
              where: {
                variantId: v.id,
                type: { in: ["PURCHASE", "FORM_SUBMIT", "OPT_IN"] },
                timestamp: { gte: dateRange.from, lte: dateRange.to },
              },
            }),
            db.payment.aggregate({
              where: {
                variantId: v.id,
                status: "succeeded",
                createdAt: { gte: dateRange.from, lte: dateRange.to },
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
            conversionRate:
              assignments > 0 ? (conversions / assignments) * 100 : 0,
          };
        })
      );

      return {
        id: exp.id,
        name: exp.name,
        slug: exp.slug,
        variants: variantData,
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/dashboard/${orgId}/funnels`}
              className="transition-colors hover:text-foreground"
            >
              Funnels
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{funnel.name}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {funnel.name}
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-secondary text-[10px] text-muted-foreground"
            >
              {funnel.type.replace(/_/g, " ")}
            </Badge>
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                funnel.isActive ? "bg-green" : "bg-muted-foreground/30"
              )}
            />
            <span className="text-[11px] text-muted-foreground/60">
              {funnel.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FunnelKpiConfig
            orgId={orgId}
            funnelId={funnelId}
            allMetrics={allMetrics}
            selectedMetricIds={funnel.kpis.map((k) => k.metricId)}
          />
          <DateRangePicker />
        </div>
      </div>

      {/* KPI Cards */}
      {kpiValues.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {kpiValues.map((kpi, i) => {
            const Icon = METRIC_ICONS[kpi.name] ?? TrendingUp;
            const color = KPI_COLORS[i % KPI_COLORS.length];
            return (
              <KpiCard
                key={kpi.metricId}
                label={kpi.name}
                value={kpi.formatted}
                icon={Icon}
                color={color}
              />
            );
          })}
        </div>
      )}

      {/* Chart */}
      <FunnelChart orgId={orgId} funnelId={funnelId} range={range} />

      {/* Breakdown Table */}
      <FunnelDetailTable
        orgId={orgId}
        funnelId={funnelId}
        steps={stepCounts}
        range={range}
      />

      {/* Active Split Tests */}
      {experimentData.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <GitBranch className="h-4 w-4" />
            Active Split Tests ({experimentData.length})
          </h2>
          <div className="space-y-4">
            {experimentData.map((exp) => {
              const winner = [...exp.variants].sort(
                (a, b) => b.conversionRate - a.conversionRate
              )[0];

              return (
                <div
                  key={exp.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium text-foreground">{exp.name}</h3>
                    <code className="text-xs text-muted-foreground/60">
                      /go/{exp.slug}
                    </code>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {exp.variants.map((v) => (
                      <div
                        key={v.id}
                        className={cn(
                          "rounded-md border p-3",
                          v.id === winner?.id && winner.visitors > 10
                            ? "border-green/30 bg-green-dim"
                            : "border-border bg-secondary"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {v.name}
                          </span>
                          {v.id === winner?.id && winner.visitors > 10 && (
                            <span className="text-[10px] font-medium text-green">
                              WINNING
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-semibold tabular-nums text-foreground">
                              {v.visitors}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60">
                              visitors
                            </p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold tabular-nums text-foreground">
                              {v.conversionRate.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground/60">
                              conv. rate
                            </p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold tabular-nums text-green">
                              ${v.revenue.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60">
                              revenue
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
