import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Sidebar, MobileHeader } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  let org;
  try {
    org = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });
  } catch (err) {
    console.error("[dashboard] DB error looking up org:", err);
    notFound();
  }

  if (!org) {
    console.error("[dashboard] Org not found for id:", orgId);
    notFound();
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background md:flex-row">
      {/* Mobile top bar */}
      <MobileHeader orgId={org.id} orgName={org.name} />

      {/* Desktop sidebar */}
      <Sidebar orgId={org.id} orgName={org.name} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-4 animate-fade-in sm:px-6 sm:py-6">{children}</div>
      </main>
    </div>
  );
}
