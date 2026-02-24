import { SourceTable } from "@/components/dashboard/source-table";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { parseDateRange } from "@/lib/dashboard/date-range";
import { getSourceBreakdown } from "@/lib/dashboard/queries";
import { Card, CardContent } from "@/components/ui/card";

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
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Sources</h1>
          <p className="text-sm text-muted-foreground">
            Performance breakdown by traffic source
          </p>
        </div>
        <DateRangePicker />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Sources", value: sources.length.toString() },
          { label: "Total Visitors", value: totals.visitors.toLocaleString() },
          { label: "Total Leads", value: totals.leads.toLocaleString() },
          { label: "Total Revenue", value: `$${totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, className: "text-green" },
        ].map((card) => (
          <Card key={card.label} className="gap-0 border-border py-0">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${card.className || "text-foreground"}`}>
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SourceTable data={sources} />
    </div>
  );
}
