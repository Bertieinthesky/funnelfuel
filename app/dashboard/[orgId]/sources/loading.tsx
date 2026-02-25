import { SkeletonKpiCards, SkeletonTable } from "@/components/dashboard/skeleton-card";
import { Pulse } from "@/components/dashboard/skeleton-card";

export default function SourcesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Pulse className="h-6 w-32" />
          <Pulse className="mt-2 h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Pulse className="h-8 w-32 rounded-md" />
          <Pulse className="h-8 w-32 rounded-md" />
        </div>
      </div>
      <SkeletonKpiCards count={4} />
      <SkeletonTable rows={6} cols={6} />
    </div>
  );
}
