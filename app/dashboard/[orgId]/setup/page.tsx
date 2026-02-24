import { db } from "@/lib/db";
import { UrlRulesManager } from "@/components/dashboard/url-rules-manager";
import { FunnelManager } from "@/components/dashboard/funnel-manager";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [urlRules, funnels] = await Promise.all([
    db.urlRule.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    }),
    db.funnel.findMany({
      where: { organizationId: orgId },
      include: {
        steps: { orderBy: { order: "asc" } },
        _count: { select: { events: true, experiments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Setup</h1>
        <p className="text-sm text-muted-foreground">
          Configure URL rules, funnels, and tracking settings
        </p>
      </div>

      {/* URL Rules */}
      <UrlRulesManager orgId={orgId} initialRules={urlRules} />

      {/* Funnels */}
      <FunnelManager
        orgId={orgId}
        initialFunnels={funnels.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
          steps: f.steps.map((s) => ({
            ...s,
            createdAt: s.createdAt.toISOString(),
          })),
          _count: f._count,
        }))}
      />
    </div>
  );
}
