import { FunnelCard } from "@/components/dashboard/funnel-card";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { parseDateRange } from "@/lib/dashboard/date-range";
import { getFunnelOverview } from "@/lib/dashboard/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function FunnelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { orgId } = await params;
  const { range } = await searchParams;
  const dateRange = parseDateRange(range ?? null);
  const funnels = await getFunnelOverview(orgId, dateRange);

  const activeFunnels = funnels.filter((f) => f.status === "ACTIVE");
  const pausedFunnels = funnels.filter((f) => f.status === "PAUSED");
  const archivedFunnels = funnels.filter((f) => f.status === "ARCHIVED");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Funnels
          </h1>
          <p className="text-sm text-muted-foreground">
            {funnels.length} funnel{funnels.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/${orgId}/funnels/new`}>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add Funnel
            </Button>
          </Link>
          <DateRangePicker />
        </div>
      </div>

      {funnels.length === 0 ? (
        <Card className="border-border py-0">
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              No funnels configured yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Funnels track multi-step conversion flows like opt-in → checkout →
              purchase.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {activeFunnels.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Active ({activeFunnels.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {activeFunnels.map((funnel) => (
                  <FunnelCard
                    key={funnel.id}
                    id={funnel.id}
                    orgId={orgId}
                    name={funnel.name}
                    type={funnel.type}
                    status={funnel.status}
                    activeTests={funnel.activeTests}
                    todayEvents={funnel.todayEvents}
                    todayRevenue={funnel.todayRevenue}
                    health={funnel.health}
                    steps={funnel.steps}
                  />
                ))}
              </div>
            </section>
          )}

          {pausedFunnels.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Paused ({pausedFunnels.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {pausedFunnels.map((funnel) => (
                  <FunnelCard
                    key={funnel.id}
                    id={funnel.id}
                    orgId={orgId}
                    name={funnel.name}
                    type={funnel.type}
                    status={funnel.status}
                    activeTests={funnel.activeTests}
                    todayEvents={funnel.todayEvents}
                    todayRevenue={funnel.todayRevenue}
                    health={funnel.health}
                    steps={funnel.steps}
                  />
                ))}
              </div>
            </section>
          )}

          {archivedFunnels.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground/60">
                Archived ({archivedFunnels.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {archivedFunnels.map((funnel) => (
                  <FunnelCard
                    key={funnel.id}
                    id={funnel.id}
                    orgId={orgId}
                    name={funnel.name}
                    type={funnel.type}
                    status={funnel.status}
                    activeTests={funnel.activeTests}
                    todayEvents={funnel.todayEvents}
                    todayRevenue={funnel.todayRevenue}
                    health={funnel.health}
                    steps={funnel.steps}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
