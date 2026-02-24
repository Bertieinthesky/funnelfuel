import { getFilterOptions } from "@/lib/dashboard/queries";
import { ReportBuilder } from "@/components/dashboard/report-builder";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const options = await getFilterOptions(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Report</h1>
        <p className="text-sm text-muted-foreground">
          Build custom views of your data with flexible grouping and metrics
        </p>
      </div>
      <ReportBuilder orgId={orgId} filterOptions={options} />
    </div>
  );
}
