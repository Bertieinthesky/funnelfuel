import { db } from "@/lib/db";
import { CreateFunnelForm } from "@/components/dashboard/create-funnel-form";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function NewFunnelPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const allMetrics = await db.metric.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true, format: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/dashboard/${orgId}/funnels`}
          className="transition-colors hover:text-foreground"
        >
          Funnels
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">New Funnel</span>
      </div>

      <CreateFunnelForm orgId={orgId} allMetrics={allMetrics} />
    </div>
  );
}
