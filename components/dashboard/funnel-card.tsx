import { cn } from "@/lib/cn";
import { Globe, GitBranch, ChevronRight } from "lucide-react";
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
  isActive: boolean;
  activeTests: number;
  steps: FunnelStep[];
}

export function FunnelCard({
  id,
  orgId,
  name,
  type,
  isActive,
  activeTests,
  steps,
}: FunnelCardProps) {
  const firstStep = steps[0];
  const lastStep = steps[steps.length - 1];
  const overallConversion =
    firstStep && lastStep && firstStep.count > 0
      ? ((lastStep.count / firstStep.count) * 100).toFixed(1)
      : "—";

  return (
    <Link
      href={`/dashboard/${orgId}/funnels/${id}`}
      className="group block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-bright"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-text-muted" />
          <h3 className="font-medium">{name}</h3>
        </div>
        <div className="flex items-center gap-2">
          {activeTests > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-dim px-2 py-0.5 text-[11px] font-medium text-blue">
              <GitBranch className="h-3 w-3" />
              {activeTests} test{activeTests !== 1 ? "s" : ""}
            </span>
          )}
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              isActive ? "bg-green" : "bg-text-dim"
            )}
          />
        </div>
      </div>

      {/* Funnel steps bar */}
      {steps.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1">
            {steps.map((step, i) => {
              const width =
                firstStep.count > 0
                  ? Math.max((step.count / firstStep.count) * 100, 8)
                  : 100 / steps.length;

              return (
                <div key={step.id} className="flex items-center gap-1">
                  <div
                    className="h-1.5 rounded-full bg-accent transition-all"
                    style={{
                      width: `${width}%`,
                      minWidth: 12,
                      opacity: 1 - i * 0.15,
                    }}
                  />
                  {i < steps.length - 1 && (
                    <ChevronRight className="h-3 w-3 shrink-0 text-text-dim" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              {firstStep.count.toLocaleString()} {firstStep.name.toLowerCase()}
            </span>
            <span>
              {overallConversion}% conversion →{" "}
              {lastStep.count.toLocaleString()} {lastStep.name.toLowerCase()}
            </span>
          </div>
        </div>
      )}

      {steps.length === 0 && (
        <p className="mt-3 text-xs text-text-dim">
          No funnel steps configured yet.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[11px] text-text-dim">
          {type.replace("_", " ").toLowerCase()}
        </span>
        <ChevronRight className="h-4 w-4 text-text-dim transition-colors group-hover:text-accent" />
      </div>
    </Link>
  );
}
