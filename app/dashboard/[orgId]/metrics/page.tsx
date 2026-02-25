import { db } from "@/lib/db";
import { seedDefaultMetrics } from "@/lib/dashboard/seed-metrics";
import { MetricsManager } from "@/components/dashboard/metrics-manager";
import { UrlRulesManager } from "@/components/dashboard/url-rules-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function MetricsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // Seed defaults on first visit
  await seedDefaultMetrics(orgId);

  const [metrics, urlRules] = await Promise.all([
    db.metric.findMany({
      where: { organizationId: orgId },
      include: {
        numeratorMetric: { select: { id: true, name: true } },
        denominatorMetric: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.urlRule.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Metrics
        </h1>
        <p className="text-sm text-muted-foreground">
          Define metrics, events, and URL rules for tracking
        </p>
      </div>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">
            Metrics ({metrics.length})
          </TabsTrigger>
          <TabsTrigger value="url-rules">
            URL Rules ({urlRules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="mt-4">
          <MetricsManager
            orgId={orgId}
            initialMetrics={metrics.map((m) => ({
              ...m,
              createdAt: m.createdAt.toISOString(),
              updatedAt: m.updatedAt.toISOString(),
              numeratorMetric: m.numeratorMetric ?? null,
              denominatorMetric: m.denominatorMetric ?? null,
            }))}
          />
        </TabsContent>

        <TabsContent value="url-rules" className="mt-4">
          <UrlRulesManager orgId={orgId} initialRules={urlRules} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
