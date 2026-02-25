import { SkeletonTable } from "@/components/dashboard/skeleton-card";
import { Pulse } from "@/components/dashboard/skeleton-card";

export default function ContactsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Pulse className="h-6 w-32" />
          <Pulse className="mt-2 h-4 w-24" />
        </div>
        <Pulse className="h-8 w-32 rounded-md" />
      </div>
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}
