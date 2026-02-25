import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { parseDateRange } from "@/lib/dashboard/date-range";
import { getSplitTestOverview } from "@/lib/dashboard/queries";
import { cn } from "@/lib/cn";
import { GitBranch, ExternalLink, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Z-score for two-proportion z-test significance
function zScore(
  c1: number,
  n1: number,
  c2: number,
  n2: number
): { z: number; significant: boolean } {
  if (n1 === 0 || n2 === 0) return { z: 0, significant: false };
  const p1 = c1 / n1;
  const p2 = c2 / n2;
  const pPool = (c1 + c2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  if (se === 0) return { z: 0, significant: false };
  const z = (p1 - p2) / se;
  return { z, significant: Math.abs(z) >= 1.96 }; // 95% confidence
}

function confidenceLevel(z: number): string {
  const absZ = Math.abs(z);
  if (absZ >= 2.576) return "99%";
  if (absZ >= 1.96) return "95%";
  if (absZ >= 1.645) return "90%";
  return "< 90%";
}

export default async function SplitTestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { orgId } = await params;
  const { range } = await searchParams;
  const dateRange = parseDateRange(range ?? null);
  const experiments = await getSplitTestOverview(orgId, dateRange);

  const active = experiments.filter((e) => e.status === "ACTIVE");
  const completed = experiments.filter((e) => e.status === "COMPLETED");
  const draft = experiments.filter(
    (e) => e.status === "DRAFT" || e.status === "PAUSED"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Split Tests
          </h1>
          <p className="text-sm text-muted-foreground">
            {experiments.length} experiment
            {experiments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <DateRangePicker />
      </div>

      {experiments.length === 0 ? (
        <Card className="border-border py-0">
          <div className="flex flex-col items-center p-12 text-center">
            <GitBranch className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              No split tests created yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Create an experiment to start A/B testing your funnels.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {[
            { label: "Active", items: active, color: "green" },
            { label: "Completed", items: completed, color: "blue" },
            { label: "Draft / Paused", items: draft, color: "yellow" },
          ]
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.label}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      group.color === "green" && "bg-green",
                      group.color === "blue" && "bg-blue",
                      group.color === "yellow" && "bg-yellow"
                    )}
                  />
                  {group.label} ({group.items.length})
                </h2>
                <div className="space-y-4">
                  {group.items.map((exp) => {
                    const winner = [...exp.variants].sort(
                      (a, b) => b.conversionRate - a.conversionRate
                    )[0];

                    // Statistical significance between top 2 variants
                    const sorted = [...exp.variants].sort(
                      (a, b) => b.conversionRate - a.conversionRate
                    );
                    const sig =
                      sorted.length >= 2
                        ? zScore(
                            sorted[0].conversions,
                            sorted[0].visitors,
                            sorted[1].conversions,
                            sorted[1].visitors
                          )
                        : null;

                    // Revenue per visitor
                    const rpvValues = exp.variants.map((v) => ({
                      id: v.id,
                      rpv: v.visitors > 0 ? v.revenue / v.visitors : 0,
                    }));

                    return (
                      <Card
                        key={exp.id}
                        className="gap-0 border-border py-0"
                      >
                        <CardContent className="p-4">
                          {/* Header */}
                          <div className="mb-4 flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-foreground">
                                {exp.name}
                              </h3>
                              <p className="text-xs text-muted-foreground/60">
                                /go/{exp.slug} · {exp.totalAssignments}{" "}
                                total assignments
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {sig && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    sig.significant
                                      ? "bg-green-dim text-green"
                                      : "bg-secondary text-muted-foreground"
                                  )}
                                >
                                  {sig.significant
                                    ? `${confidenceLevel(sig.z)} significant`
                                    : "Not significant"}
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className={cn(
                                  exp.status === "ACTIVE" &&
                                    "bg-green-dim text-green",
                                  exp.status === "COMPLETED" &&
                                    "bg-blue-dim text-blue",
                                  (exp.status === "DRAFT" ||
                                    exp.status === "PAUSED") &&
                                    "bg-yellow-dim text-yellow"
                                )}
                              >
                                {exp.status.toLowerCase()}
                              </Badge>
                            </div>
                          </div>

                          {/* Variant Cards */}
                          <div className="grid gap-3 md:grid-cols-2">
                            {exp.variants.map((v) => {
                              const rpv = rpvValues.find(
                                (r) => r.id === v.id
                              );
                              return (
                                <Card
                                  key={v.id}
                                  className={cn(
                                    "gap-0 py-0",
                                    v.id === winner?.id &&
                                      winner.visitors > 10
                                      ? "border-green/30 bg-green-dim/30"
                                      : "border-border bg-secondary"
                                  )}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-foreground">
                                        {v.name}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {v.id === winner?.id &&
                                          winner.visitors > 10 && (
                                            <span className="text-[10px] font-medium text-green">
                                              WINNING
                                            </span>
                                          )}
                                        <span className="text-[10px] text-muted-foreground/60">
                                          {v.weight}% traffic
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                                      <ExternalLink className="h-3 w-3" />
                                      <span className="truncate">
                                        {v.url}
                                      </span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                                      <div>
                                        <p className="text-base font-semibold tabular-nums text-foreground">
                                          {v.visitors}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60">
                                          visitors
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-base font-semibold tabular-nums text-foreground">
                                          {v.conversions}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60">
                                          conversions
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-base font-semibold tabular-nums text-foreground">
                                          {v.conversionRate.toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60">
                                          conv. rate
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-base font-semibold tabular-nums text-green">
                                          ${v.revenue.toFixed(0)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60">
                                          revenue
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-base font-semibold tabular-nums text-primary">
                                          $
                                          {(rpv?.rpv ?? 0).toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60">
                                          RPV
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>

                          {/* Comparison Table */}
                          {exp.variants.length >= 2 && (
                            <div className="mt-4 overflow-hidden rounded-lg border border-border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="px-3 text-xs">
                                      Metric
                                    </TableHead>
                                    {exp.variants.map((v) => (
                                      <TableHead
                                        key={v.id}
                                        className="px-3 text-right text-xs"
                                      >
                                        {v.name}
                                      </TableHead>
                                    ))}
                                    <TableHead className="px-3 text-right text-xs">
                                      Diff
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {[
                                    {
                                      label: "Visitors",
                                      key: "visitors" as const,
                                      format: "number",
                                    },
                                    {
                                      label: "Conversions",
                                      key: "conversions" as const,
                                      format: "number",
                                    },
                                    {
                                      label: "Conv. Rate",
                                      key: "conversionRate" as const,
                                      format: "percent",
                                    },
                                    {
                                      label: "Revenue",
                                      key: "revenue" as const,
                                      format: "currency",
                                    },
                                  ].map((metric) => {
                                    const values = exp.variants.map(
                                      (v) => v[metric.key]
                                    );
                                    const maxVal = Math.max(...values);
                                    const minVal = Math.min(...values);
                                    const diff =
                                      minVal > 0
                                        ? (
                                            ((maxVal - minVal) / minVal) *
                                            100
                                          ).toFixed(1)
                                        : maxVal > 0
                                          ? "+"
                                          : "0";

                                    return (
                                      <TableRow
                                        key={metric.key}
                                        className="border-border"
                                      >
                                        <TableCell className="px-3 text-xs font-medium text-muted-foreground">
                                          {metric.label}
                                        </TableCell>
                                        {exp.variants.map((v) => {
                                          const val = v[metric.key];
                                          const isMax = val === maxVal && values.filter((x) => x === maxVal).length === 1;
                                          let formatted: string;
                                          if (metric.format === "currency")
                                            formatted = `$${val.toFixed(0)}`;
                                          else if (
                                            metric.format === "percent"
                                          )
                                            formatted = `${val.toFixed(1)}%`;
                                          else
                                            formatted =
                                              val.toLocaleString();

                                          return (
                                            <TableCell
                                              key={v.id}
                                              className={cn(
                                                "px-3 text-right text-xs tabular-nums",
                                                isMax
                                                  ? "font-semibold text-green"
                                                  : "text-muted-foreground"
                                              )}
                                            >
                                              {formatted}
                                            </TableCell>
                                          );
                                        })}
                                        <TableCell className="px-3 text-right text-xs tabular-nums text-muted-foreground/60">
                                          {diff === "0" ? (
                                            <Minus className="ml-auto h-3 w-3" />
                                          ) : (
                                            <span className="flex items-center justify-end gap-0.5">
                                              <TrendingUp className="h-3 w-3 text-green" />
                                              {diff}%
                                            </span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
        </>
      )}
    </div>
  );
}
