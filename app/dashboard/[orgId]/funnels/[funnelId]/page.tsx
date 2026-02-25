import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { parseDateRange } from "@/lib/dashboard/date-range";
import {
  getFunnelStepCounts,
  getFunnelKpiValues,
  getFunnelHealth,
} from "@/lib/dashboard/funnel-detail";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { FunnelDetailTable } from "@/components/dashboard/funnel-detail-table";
import { FunnelKpiConfig } from "@/components/dashboard/funnel-kpi-config";
import { FunnelStatusSelect } from "@/components/dashboard/funnel-status-select";
import { EditFunnelDialog } from "@/components/dashboard/edit-funnel-dialog";
import { FunnelHealthPanel } from "@/components/dashboard/funnel-health-panel";
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

  // Get step counts and health in parallel
  const [stepCounts, health] = await Promise.all([
    getFunnelStepCounts(funnelId, funnel.steps, dateRange),
    getFunnelHealth(funnelId, funnel.steps),
  ]);

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

  // Get variant performance — batch all variant IDs into grouped queries
  const allVariants = funnel.experiments.flatMap((exp) =>
    exp.variants.map((v) => ({ ...v, expId: exp.id }))
  );
  const allVariantIds = allVariants.map((v) => v.id);

  const [assignmentCounts, conversionCounts, revenueSums] =
    allVariantIds.length > 0
      ? await Promise.all([
          db.experimentAssignment.groupBy({
            by: ["variantId"],
            where: {
              variantId: { in: allVariantIds },
              assignedAt: { gte: dateRange.from, lte: dateRange.to },
            },
            _count: true,
          }),
          db.event.groupBy({
            by: ["variantId"],
            where: {
              variantId: { in: allVariantIds },
              type: { in: ["PURCHASE", "FORM_SUBMIT", "OPT_IN"] },
              timestamp: { gte: dateRange.from, lte: dateRange.to },
            },
            _count: true,
          }),
          db.payment.groupBy({
            by: ["variantId"],
            where: {
              variantId: { in: allVariantIds },
              status: "succeeded",
              createdAt: { gte: dateRange.from, lte: dateRange.to },
            },
            _sum: { amountCents: true },
          }),
        ])
      : [[], [], []];

  const assignMap = new Map(
    assignmentCounts.map((a) => [a.variantId, a._count])
  );
  const convMap = new Map(
    conversionCounts.map((c) => [c.variantId, c._count])
  );
  const revMap = new Map(
    revenueSums.map((r) => [r.variantId, (r._sum.amountCents ?? 0) / 100])
  );

  const experimentData = funnel.experiments.map((exp) => ({
    id: exp.id,
    name: exp.name,
    slug: exp.slug,
    variants: exp.variants.map((v) => {
      const visitors = assignMap.get(v.id) ?? 0;
      const conversions = convMap.get(v.id) ?? 0;
      const revenue = revMap.get(v.id) ?? 0;
      return {
        id: v.id,
        name: v.name,
        url: v.url,
        weight: v.weight,
        visitors,
        conversions,
        revenue,
        conversionRate: visitors > 0 ? (conversions / visitors) * 100 : 0,
      };
    }),
  }));

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
            <FunnelStatusSelect
              orgId={orgId}
              funnelId={funnelId}
              currentStatus={funnel.status}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditFunnelDialog
            orgId={orgId}
            funnelId={funnelId}
            initialName={funnel.name}
            initialType={funnel.type}
            initialSteps={funnel.steps.map((s) => ({
              name: s.name,
              type: s.type,
              urlPattern: s.urlPattern ?? "",
            }))}
          />
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

      {/* Health Status */}
      {health.steps.length > 0 && (
        <FunnelHealthPanel overall={health.overall} steps={health.steps} />
      )}

      {/* Chart */}
      <FunnelChart orgId={orgId} funnelId={funnelId} range={range} metrics={allMetrics} />

      {/* Breakdown Table */}
      <FunnelDetailTable
        orgId={orgId}
        funnelId={funnelId}
        steps={stepCounts}
        stepHealth={health.steps}
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
