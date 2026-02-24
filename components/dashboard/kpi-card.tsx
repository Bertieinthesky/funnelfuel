import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
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
  accent: { bg: "bg-primary/10", text: "text-primary", glow: "group-hover:shadow-[0_0_20px_-4px] group-hover:shadow-primary/20" },
  green: { bg: "bg-green-dim", text: "text-green", glow: "group-hover:shadow-[0_0_20px_-4px] group-hover:shadow-green/20" },
  blue: { bg: "bg-blue-dim", text: "text-blue", glow: "group-hover:shadow-[0_0_20px_-4px] group-hover:shadow-blue/20" },
  yellow: { bg: "bg-yellow-dim", text: "text-yellow", glow: "group-hover:shadow-[0_0_20px_-4px] group-hover:shadow-yellow/20" },
};

export function KpiCard({ label, value, subtitle, icon: Icon, trend, color = "accent" }: KpiCardProps) {
  const c = colorMap[color];

  return (
    <Card className={cn(
      "group gap-0 border-border py-0 transition-all duration-200 hover:border-border-bright",
      c.glow
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground/60">{subtitle}</p>
            )}
          </div>
          <div className={cn("rounded-lg p-2", c.bg)}>
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
            <span className="text-xs text-muted-foreground/60">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
