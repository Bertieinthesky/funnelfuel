import { cn } from "@/lib/cn";
import { type LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "accent" | "green" | "blue" | "yellow";
}

const colorMap = {
  accent: { bg: "bg-accent-dim", text: "text-accent", border: "border-accent/20" },
  green: { bg: "bg-green-dim", text: "text-green", border: "border-green/20" },
  blue: { bg: "bg-blue-dim", text: "text-blue", border: "border-blue/20" },
  yellow: { bg: "bg-yellow-dim", text: "text-yellow", border: "border-yellow/20" },
};

export function KpiCard({ label, value, subtitle, icon: Icon, trend, color = "accent" }: KpiCardProps) {
  const c = colorMap[color];

  return (
    <div className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-bright">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-text-dim">{subtitle}</p>
          )}
        </div>
        <div className={cn("rounded-md p-2", c.bg)}>
          <Icon className={cn("h-4 w-4", c.text)} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium",
              trend.value >= 0 ? "text-green" : "text-red"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value.toFixed(1)}%
          </span>
          <span className="text-xs text-text-dim">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
