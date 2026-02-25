import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-secondary", className)}
    />
  );
}

export function SkeletonKpiCards({ count = 4 }: { count?: number }) {
  return (
    <div className={cn("grid gap-3", `grid-cols-${count > 4 ? 4 : count}`)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="gap-0 border-border py-0">
          <CardContent className="p-4">
            <Pulse className="h-3 w-20" />
            <Pulse className="mt-3 h-7 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card className="gap-0 border-border py-0">
      <CardContent className="p-4">
        <div className="rounded-md border border-border">
          <div className="border-b border-border px-4 py-3">
            <div className="flex gap-8">
              {Array.from({ length: cols }).map((_, i) => (
                <Pulse key={i} className="h-3 w-16" />
              ))}
            </div>
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="border-b border-border px-4 py-3 last:border-0">
              <div className="flex gap-8">
                {Array.from({ length: cols }).map((_, j) => (
                  <Pulse key={j} className="h-4 w-16" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonChart() {
  return (
    <Card className="gap-0 border-border py-0">
      <CardContent className="p-4">
        <Pulse className="h-4 w-32" />
        <Pulse className="mt-4 h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}

export function SkeletonFunnelCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="gap-0 border-border py-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Pulse className="h-5 w-36" />
              <Pulse className="h-4 w-12" />
            </div>
            <Pulse className="mt-3 h-3 w-20" />
            <div className="mt-3 flex gap-6">
              <Pulse className="h-8 w-16" />
              <Pulse className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export { Pulse };
