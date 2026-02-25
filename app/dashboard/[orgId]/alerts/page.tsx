import { db } from "@/lib/db";
import { AlertManager } from "@/components/dashboard/alert-manager";

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [alerts, funnels] = await Promise.all([
    db.alert.findMany({
      where: { organizationId: orgId },
      include: { funnel: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.funnel.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Alerts
        </h1>
        <p className="text-sm text-muted-foreground">
          Get notified when expected events stop coming through
        </p>
      </div>
      <AlertManager
        orgId={orgId}
        alerts={alerts.map((a) => ({
          ...a,
          lastFiredAt: a.lastFiredAt?.toISOString() ?? null,
          lastEventAt: a.lastEventAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
        }))}
        funnels={funnels}
      />
    </div>
  );
}
