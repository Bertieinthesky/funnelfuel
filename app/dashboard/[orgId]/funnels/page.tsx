import { FunnelCard } from "@/components/dashboard/funnel-card";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { parseDateRange } from "@/lib/dashboard/date-range";
import { getFunnelOverview } from "@/lib/dashboard/queries";

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

  const activeFunnels = funnels.filter((f) => f.isActive);
  const inactiveFunnels = funnels.filter((f) => !f.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Funnels</h1>
          <p className="text-sm text-text-muted">
            {funnels.length} funnel{funnels.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <DateRangePicker />
      </div>

      {funnels.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-text-muted">No funnels configured yet.</p>
          <p className="mt-1 text-sm text-text-dim">
            Funnels track multi-step conversion flows like opt-in → checkout → purchase.
          </p>
        </div>
      ) : (
        <>
          {activeFunnels.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-text-muted">
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
                    isActive={funnel.isActive}
                    activeTests={funnel.activeTests}
                    steps={funnel.steps}
                  />
                ))}
              </div>
            </section>
          )}

          {inactiveFunnels.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-text-muted">
                Inactive ({inactiveFunnels.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {inactiveFunnels.map((funnel) => (
                  <FunnelCard
                    key={funnel.id}
                    id={funnel.id}
                    orgId={orgId}
                    name={funnel.name}
                    type={funnel.type}
                    isActive={funnel.isActive}
                    activeTests={funnel.activeTests}
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
