"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

type HealthLevel = "healthy" | "warning" | "critical" | "inactive";

interface StepHealth {
  stepId: string;
  stepName: string;
  status: HealthLevel;
  currentCount: number;
  previousCount: number;
  changePct: number;
}

interface FunnelHealthPanelProps {
  overall: HealthLevel;
  steps: StepHealth[];
}

const STATUS_CONFIG: Record<
  HealthLevel,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  healthy: {
    icon: CheckCircle2,
    color: "text-green",
    bg: "bg-green-dim",
    label: "Healthy",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow",
    bg: "bg-yellow-dim",
    label: "Warning",
  },
  critical: {
    icon: XCircle,
    color: "text-red",
    bg: "bg-red/10",
    label: "Needs Attention",
  },
  inactive: {
    icon: MinusCircle,
    color: "text-muted-foreground/60",
    bg: "bg-secondary",
    label: "No Data",
  },
};

export function FunnelHealthPanel({ overall, steps }: FunnelHealthPanelProps) {
  const [expanded, setExpanded] = useState(overall !== "healthy");

  const overallCfg = STATUS_CONFIG[overall];
  const OverallIcon = overallCfg.icon;

  const healthyCount = steps.filter((s) => s.status === "healthy").length;
  const warningCount = steps.filter((s) => s.status === "warning").length;
  const criticalCount = steps.filter((s) => s.status === "critical").length;

  return (
    <Card className="gap-0 border-border py-0">
      <CardContent className="p-0">
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between rounded-none px-4 py-3 hover:bg-secondary/50"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center justify-center rounded-full p-1", overallCfg.bg)}>
              <OverallIcon className={cn("h-4 w-4", overallCfg.color)} />
            </div>
            <span className="text-sm font-medium text-foreground">
              Funnel Health
            </span>
            <span className={cn("text-xs font-medium", overallCfg.color)}>
              {overallCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {healthyCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-green">
                <CheckCircle2 className="h-3 w-3" />
                {healthyCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-yellow">
                <AlertTriangle className="h-3 w-3" />
                {warningCount}
              </span>
            )}
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-red">
                <XCircle className="h-3 w-3" />
                {criticalCount}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground/40 transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
          </div>
        </Button>

        {expanded && (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-3 text-[11px] text-muted-foreground/60">
              Last 7 days vs. prior 7 days
            </p>
            <div className="space-y-2">
              {steps.map((step) => {
                const cfg = STATUS_CONFIG[step.status];
                const StepIcon = cfg.icon;
                const isUp = step.changePct > 0;
                const isDown = step.changePct < 0;
                const TrendIcon = isUp
                  ? TrendingUp
                  : isDown
                    ? TrendingDown
                    : Minus;

                return (
                  <div
                    key={step.stepId}
                    className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <StepIcon className={cn("h-4 w-4 shrink-0", cfg.color)} />
                    <span className="flex-1 text-sm text-foreground">
                      {step.stepName}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="tabular-nums text-muted-foreground">
                        {step.currentCount.toLocaleString()} events
                      </span>
                      {(step.currentCount > 0 || step.previousCount > 0) && (
                        <span
                          className={cn(
                            "flex items-center gap-0.5 tabular-nums",
                            isUp && "text-green",
                            isDown && step.changePct < -10 && "text-red",
                            isDown && step.changePct >= -10 && "text-yellow",
                            !isUp && !isDown && "text-muted-foreground/60"
                          )}
                        >
                          <TrendIcon className="h-3 w-3" />
                          {step.changePct > 0 ? "+" : ""}
                          {step.changePct.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
