import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });

  if (!org) notFound();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar orgId={org.id} orgName={org.name} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
