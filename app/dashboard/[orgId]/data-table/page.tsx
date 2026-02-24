import { getFilterOptions } from "@/lib/dashboard/queries";
import { DataTableBuilder } from "@/components/dashboard/data-table-builder";

export default async function DataTablePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const options = await getFilterOptions(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Data Table</h1>
        <p className="text-sm text-muted-foreground">
          Build custom views of your data with flexible grouping and metrics
        </p>
      </div>
      <DataTableBuilder orgId={orgId} filterOptions={options} />
    </div>
  );
}
