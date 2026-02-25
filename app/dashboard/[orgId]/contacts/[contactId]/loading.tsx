import { Pulse } from "@/components/dashboard/skeleton-card";
import { Card, CardContent } from "@/components/ui/card";

export default function ContactDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Pulse className="h-4 w-16" />
        <Pulse className="h-3 w-3" />
        <Pulse className="h-4 w-24" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Info card */}
        <Card className="gap-0 border-border py-0 lg:col-span-2">
          <CardContent className="p-5">
            <Pulse className="h-6 w-40" />
            <Pulse className="mt-3 h-4 w-48" />
            <Pulse className="mt-2 h-4 w-36" />
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="gap-0 border-border py-0">
              <CardContent className="p-4">
                <Pulse className="h-3 w-20" />
                <Pulse className="mt-2 h-7 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Timeline skeleton */}
      <div>
        <Pulse className="h-4 w-32" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Pulse className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Pulse className="h-4 w-48" />
                <Pulse className="mt-1 h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
