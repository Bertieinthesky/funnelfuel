import {
  SkeletonKpiCards,
  SkeletonChart,
  SkeletonTable,
} from "@/components/dashboard/skeleton-card";
import { Pulse } from "@/components/dashboard/skeleton-card";

export default function FunnelDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Pulse className="h-4 w-40" />
          <Pulse className="mt-2 h-6 w-48" />
          <Pulse className="mt-2 h-5 w-24 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Pulse className="h-8 w-24 rounded-md" />
          <Pulse className="h-8 w-28 rounded-md" />
          <Pulse className="h-8 w-32 rounded-md" />
        </div>
      </div>
      <SkeletonKpiCards count={5} />
      <SkeletonChart />
      <SkeletonTable rows={4} cols={5} />
    </div>
  );
}
