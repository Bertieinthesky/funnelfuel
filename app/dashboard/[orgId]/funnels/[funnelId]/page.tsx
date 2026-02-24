import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { DateRangePicker, parseDateRange } from "@/components/dashboard/date-range-picker";
import { cn } from "@/lib/cn";
import { ChevronRight, GitBranch } from "lucide-react";
import Link from "next/link";

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
        include: {
          variants: true,
        },
      },
    },
  });

  if (!funnel) notFound();

  // Get event counts per step
  const stepCounts = await Promise.all(
    funnel.steps.map(async (step) => {
      const count = await db.event.count({
        where: {
          funnelStepId: step.id,
          timestamp: { gte: dateRange.from, lte: dateRange.to },
        },
      });
      return { ...step, count };
    })
  );

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
            conversionRate: assignments > 0 ? (conversions / assignments) * 100 : 0,
          };
        })
      );

      return { id: exp.id, name: exp.name, slug: exp.slug, variants: variantData };
    })
  );

  const firstStep = stepCounts[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Link href={`/dashboard/${orgId}/funnels`} className="hover:text-text">
              Funnels
            </Link>
            <ChevronRight className="h-3 w-3" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{funnel.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[11px] text-text-dim">
              {funnel.type.replace("_", " ").toLowerCase()}
            </span>
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                funnel.isActive ? "bg-green" : "bg-text-dim"
              )}
            />
          </div>
        </div>
        <DateRangePicker />
      </div>

      {/* Funnel Steps */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-text-muted">Funnel Steps</h2>
        <div className="space-y-2">
          {stepCounts.map((step, i) => {
            const prevCount = i > 0 ? stepCounts[i - 1].count : step.count;
            const dropoff =
              prevCount > 0
                ? ((1 - step.count / prevCount) * 100).toFixed(1)
                : "0.0";
            const widthPct =
              firstStep && firstStep.count > 0
                ? Math.max((step.count / firstStep.count) * 100, 5)
                : 100;

            return (
              <div
                key={step.id}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-elevated text-[11px] font-medium text-text-muted">
                      {step.order + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{step.name}</p>
                      <p className="text-[11px] text-text-dim">
                        {step.type.replace("_", " ").toLowerCase()}
                        {step.urlPattern && ` · ${step.urlPattern}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular-nums">
                      {step.count.toLocaleString()}
                    </p>
                    {i > 0 && (
                      <p className="text-[11px] text-red">-{dropoff}% dropoff</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active Split Tests */}
      {experimentData.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-muted">
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
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">{exp.name}</h3>
                    <code className="text-xs text-text-dim">/go/{exp.slug}</code>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {exp.variants.map((v) => (
                      <div
                        key={v.id}
                        className={cn(
                          "rounded-md border p-3",
                          v.id === winner?.id && winner.visitors > 10
                            ? "border-green/30 bg-green-dim/30"
                            : "border-border bg-surface-elevated"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{v.name}</span>
                          {v.id === winner?.id && winner.visitors > 10 && (
                            <span className="text-[10px] font-medium text-green">
                              WINNING
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-semibold tabular-nums">
                              {v.visitors}
                            </p>
                            <p className="text-[10px] text-text-dim">visitors</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold tabular-nums">
                              {v.conversionRate.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-text-dim">conv. rate</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold tabular-nums text-green">
                              ${v.revenue.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-text-dim">revenue</p>
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
