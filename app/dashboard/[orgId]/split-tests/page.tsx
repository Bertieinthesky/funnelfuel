import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { parseDateRange } from "@/lib/dashboard/date-range";
import { getSplitTestOverview } from "@/lib/dashboard/queries";
import { cn } from "@/lib/cn";
import { GitBranch, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const draft = experiments.filter((e) => e.status === "DRAFT" || e.status === "PAUSED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Split Tests</h1>
          <p className="text-sm text-muted-foreground">
            {experiments.length} experiment{experiments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <DateRangePicker />
      </div>

      {experiments.length === 0 ? (
        <Card className="border-border py-0">
          <div className="flex flex-col items-center p-12 text-center">
            <GitBranch className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-muted-foreground">No split tests created yet.</p>
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

                    return (
                      <Card key={exp.id} className="gap-0 border-border py-0">
                        <CardContent className="p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-foreground">{exp.name}</h3>
                              <p className="text-xs text-muted-foreground/60">
                                /go/{exp.slug} · {exp.totalAssignments} total
                                assignments
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                exp.status === "ACTIVE" && "bg-green-dim text-green",
                                exp.status === "COMPLETED" && "bg-blue-dim text-blue",
                                (exp.status === "DRAFT" || exp.status === "PAUSED") &&
                                  "bg-yellow-dim text-yellow"
                              )}
                            >
                              {exp.status.toLowerCase()}
                            </Badge>
                          </div>

                          {/* Variant comparison */}
                          <div className="grid gap-3 md:grid-cols-2">
                            {exp.variants.map((v) => (
                              <Card
                                key={v.id}
                                className={cn(
                                  "gap-0 py-0",
                                  v.id === winner?.id && winner.visitors > 10
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
                                      {v.id === winner?.id && winner.visitors > 10 && (
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
                                    <span className="truncate">{v.url}</span>
                                  </div>
                                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
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
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
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
