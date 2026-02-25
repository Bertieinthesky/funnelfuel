import { db } from "@/lib/db";
import { getFilterOptions } from "@/lib/dashboard/queries";
import { SegmentBuilder } from "@/components/dashboard/segment-builder";

export default async function SegmentsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [segments, filterOptions] = await Promise.all([
    db.segment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    }),
    getFilterOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Segments
        </h1>
        <p className="text-sm text-muted-foreground">
          Define reusable audience groups to filter your data
        </p>
      </div>
      <SegmentBuilder
        orgId={orgId}
        segments={segments.map((s) => ({
          ...s,
          rules: s.rules as { field: string; op: string; value: string }[],
          createdAt: s.createdAt.toISOString(),
        }))}
        filterOptions={filterOptions}
      />
    </div>
  );
}
