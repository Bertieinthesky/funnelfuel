import { cn } from "@/lib/cn";
import { GitBranch, ChevronRight, ArrowRight, Activity, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface FunnelStep {
  id: string;
  name: string;
  type: string;
  order: number;
  count: number;
}

interface FunnelCardProps {
  id: string;
  orgId: string;
  name: string;
  type: string;
  status: string;
  activeTests: number;
  todayEvents?: number;
  todayRevenue?: number;
  steps: FunnelStep[];
}

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  ACTIVE: { dot: "bg-green", label: "Active" },
  PAUSED: { dot: "bg-yellow", label: "Paused" },
  ARCHIVED: { dot: "bg-muted-foreground/40", label: "Archived" },
};

export function FunnelCard({
  id,
  orgId,
  name,
  type,
  status,
  activeTests,
  todayEvents = 0,
  todayRevenue = 0,
  steps,
}: FunnelCardProps) {
  const firstStep = steps[0];
  const lastStep = steps[steps.length - 1];
  const overallConversion =
    firstStep && lastStep && firstStep.count > 0
      ? ((lastStep.count / firstStep.count) * 100).toFixed(1)
      : null;

  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ACTIVE;

  return (
    <Link href={`/dashboard/${orgId}/funnels/${id}`} className="block">
      <Card
        className={cn(
          "group gap-0 border-border py-0 transition-all duration-200 hover:border-border-bright hover:shadow-[0_0_20px_-4px] hover:shadow-primary/10",
          status === "ARCHIVED" && "opacity-60"
        )}
      >
        <CardContent className="p-4">
          {/* Top row: name + status/tests */}
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-foreground">{name}</h3>
            <div className="flex items-center gap-2">
              {activeTests > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1 border-0 bg-blue-dim text-blue"
                >
                  <GitBranch className="h-3 w-3" />
                  {activeTests} test{activeTests !== 1 ? "s" : ""}
                </Badge>
              )}
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    statusCfg.dot
                  )}
                />
                <span className="text-[10px] text-muted-foreground/60">
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>

          {/* Step flow chain */}
          {steps.length > 0 ? (
            <div className="mt-3">
              <div className="flex items-center gap-1 overflow-hidden text-[11px] text-muted-foreground">
                {steps.map((step, i) => (
                  <span key={step.id} className="flex items-center gap-1">
                    <span className="whitespace-nowrap">{step.name}</span>
                    {i < steps.length - 1 && (
                      <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground/30" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground/60">
              No funnel steps configured yet.
            </p>
          )}

          {/* Today's stats */}
          <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium tabular-nums text-foreground">
                {todayEvents.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground/60">events today</span>
            </div>
            {todayRevenue > 0 && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3 w-3 text-green" />
                <span className="text-xs font-medium tabular-nums text-green">
                  ${todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-muted-foreground/60">today</span>
              </div>
            )}
            {steps.length > 0 && overallConversion && (
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {firstStep.count.toLocaleString()} → {lastStep.count.toLocaleString()}
                </span>
                <span className="text-xs font-medium tabular-nums text-primary">
                  {overallConversion}%
                </span>
              </div>
            )}
          </div>

          {/* Bottom row: type + nav */}
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px]">
              {type.replace(/_/g, " ")}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
