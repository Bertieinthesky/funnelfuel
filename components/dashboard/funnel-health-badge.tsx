"use client";

import { cn } from "@/lib/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";

type HealthLevel = "healthy" | "warning" | "critical" | "inactive";

const HEALTH_CONFIG: Record<
  HealthLevel,
  { icon: typeof CheckCircle2; color: string; label: string; desc: string }
> = {
  healthy: {
    icon: CheckCircle2,
    color: "text-green",
    label: "Healthy",
    desc: "All steps performing within normal range",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow",
    label: "Warning",
    desc: "Some steps declining vs. previous week",
  },
  critical: {
    icon: XCircle,
    color: "text-red",
    label: "Needs Attention",
    desc: "Significant decline or zero activity detected",
  },
  inactive: {
    icon: MinusCircle,
    color: "text-muted-foreground/40",
    label: "No Data",
    desc: "No events recorded in the past 2 weeks",
  },
};

export function FunnelHealthBadge({ health }: { health: HealthLevel }) {
  const cfg = HEALTH_CONFIG[health];
  const Icon = cfg.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1 cursor-default",
              cfg.color
            )}
            onClick={(e) => e.preventDefault()}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{cfg.label}</p>
          <p className="text-muted-foreground">{cfg.desc}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
