import { SourceTable } from "@/components/dashboard/source-table";
import { DateRangePicker, parseDateRange } from "@/components/dashboard/date-range-picker";
import { getSourceBreakdown } from "@/lib/dashboard/queries";

export default async function SourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { orgId } = await params;
  const { range } = await searchParams;
  const dateRange = parseDateRange(range ?? null);
  const sources = await getSourceBreakdown(orgId, dateRange);

  // Calculate totals
  const totals = sources.reduce(
    (acc, s) => ({
      visitors: acc.visitors + s.visitors,
      leads: acc.leads + s.leads,
      purchases: acc.purchases + s.purchases,
      revenue: acc.revenue + s.revenue,
    }),
    { visitors: 0, leads: 0, purchases: 0, revenue: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sources</h1>
          <p className="text-sm text-text-muted">
            Performance breakdown by traffic source
          </p>
        </div>
        <DateRangePicker />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">Total Sources</p>
          <p className="mt-1 text-2xl font-semibold">{sources.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">Total Visitors</p>
          <p className="mt-1 text-2xl font-semibold">
            {totals.visitors.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">Total Leads</p>
          <p className="mt-1 text-2xl font-semibold">
            {totals.leads.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">Total Revenue</p>
          <p className="mt-1 text-2xl font-semibold text-green">
            ${totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <SourceTable data={sources} />
    </div>
  );
}
