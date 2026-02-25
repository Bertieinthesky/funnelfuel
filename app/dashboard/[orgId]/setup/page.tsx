import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { SetupTabs } from "@/components/dashboard/setup/setup-tabs";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { publicKey: true },
  });

  if (!org) notFound();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Install the tracking pixel, connect your integrations, and verify everything is working.
        </p>
      </div>

      <SetupTabs orgId={orgId} publicKey={org.publicKey} />
    </div>
  );
}
