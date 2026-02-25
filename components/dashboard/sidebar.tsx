"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Radio,
  Globe,
  GitBranch,
  Users,
  Activity,
  FileBarChart,
  BarChart3,
  Layers,
  Bell,
  Settings,
  Menu,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { label: "Overview", icon: LayoutDashboard, path: "" },
      { label: "Live Feed", icon: Activity, path: "/feed" },
    ],
  },
  {
    heading: "Acquisition",
    items: [
      { label: "Sources", icon: Radio, path: "/sources" },
      { label: "Funnels", icon: Globe, path: "/funnels" },
      { label: "Split Tests", icon: GitBranch, path: "/split-tests" },
    ],
  },
  {
    heading: "People",
    items: [
      { label: "Contacts", icon: Users, path: "/contacts" },
      { label: "Segments", icon: Layers, path: "/segments" },
    ],
  },
  {
    heading: "Insights",
    items: [
      { label: "Report", icon: FileBarChart, path: "/reports" },
      { label: "Metrics", icon: BarChart3, path: "/metrics" },
      { label: "Alerts", icon: Bell, path: "/alerts" },
    ],
  },
  {
    items: [
      { label: "Setup", icon: Settings, path: "/setup" },
    ],
  },
];

/* ── Shared nav content ────────────────────────────────── */

function SidebarNav({
  orgId,
  orgName,
  onNavigate,
}: {
  orgId: string;
  orgName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/dashboard/${orgId}`;

  return (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="text-lg font-bold tracking-tight text-foreground">
          Funnel<span className="text-primary">Fuel</span>
        </div>
      </div>

      <Separator />

      {/* Org name */}
      <div className="px-4 py-3">
        <p className="truncate text-xs font-medium text-muted-foreground">{orgName}</p>
      </div>

      <Separator />

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navSections.map((section, si) => (
          <div key={si} className={cn(si > 0 && "mt-4")}>
            {section.heading && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                {section.heading}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const href = `${base}${item.path}`;
                const isActive =
                  item.path === ""
                    ? pathname === base || pathname === `${base}/`
                    : pathname.startsWith(href);

                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    asChild
                    onClick={onNavigate}
                    className={cn(
                      "w-full justify-start gap-2.5 font-normal",
                      isActive
                        ? "bg-primary/10 text-foreground hover:bg-primary/15"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Link href={href}>
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-primary" : "text-primary/60"
                        )}
                      />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <Separator />
      <div className="px-4 py-3">
        <p className="text-[11px] text-muted-foreground/60">FunnelFuel v0.1</p>
      </div>
    </>
  );
}

/* ── Desktop sidebar (hidden on mobile) ────────────────── */

export function Sidebar({ orgId, orgName }: { orgId: string; orgName: string }) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
      <SidebarNav orgId={orgId} orgName={orgName} />
    </aside>
  );
}

/* ── Mobile header + sheet (hidden on desktop) ─────────── */

export function MobileHeader({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
      <div className="text-lg font-bold tracking-tight text-foreground">
        Funnel<span className="text-primary">Fuel</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarNav orgId={orgId} orgName={orgName} onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
