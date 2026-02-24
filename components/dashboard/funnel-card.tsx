import { cn } from "@/lib/cn";
import { Globe, GitBranch, ChevronRight } from "lucide-react";
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
    <Link href={`/dashboard/${orgId}/funnels/${id}`} className="block">
      <Card className="group gap-0 border-border py-0 transition-all duration-200 hover:border-border-bright hover:shadow-[0_0_20px_-4px] hover:shadow-primary/10">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground">{name}</h3>
            </div>
            <div className="flex items-center gap-2">
              {activeTests > 0 && (
                <Badge variant="secondary" className="bg-blue-dim text-blue border-0 gap-1">
                  <GitBranch className="h-3 w-3" />
                  {activeTests} test{activeTests !== 1 ? "s" : ""}
                </Badge>
              )}
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  isActive ? "bg-green" : "bg-muted-foreground/40"
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
                        className="h-1.5 rounded-full bg-primary transition-all"
                        style={{
                          width: `${width}%`,
                          minWidth: 12,
                          opacity: 1 - i * 0.15,
                        }}
                      />
                      {i < steps.length - 1 && (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
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
            <p className="mt-3 text-xs text-muted-foreground/60">
              No funnel steps configured yet.
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <Badge variant="secondary" className="text-[11px]">
              {type.replace("_", " ").toLowerCase()}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
