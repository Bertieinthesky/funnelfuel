import { SkeletonKpiCards, SkeletonFunnelCards } from "@/components/dashboard/skeleton-card";
import { Pulse } from "@/components/dashboard/skeleton-card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Pulse className="h-6 w-48" />
        <Pulse className="mt-2 h-4 w-32" />
      </div>
      <SkeletonKpiCards count={4} />
      <SkeletonFunnelCards count={4} />
    </div>
  );
}
