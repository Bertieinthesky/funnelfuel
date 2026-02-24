"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  LayoutDashboard,
  Radio,
  Globe,
  GitBranch,
  Users,
  Activity,
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Live Feed", icon: Activity, path: "/feed" },
  { label: "Sources", icon: Radio, path: "/sources" },
  { label: "Funnels", icon: Globe, path: "/funnels" },
  { label: "Split Tests", icon: GitBranch, path: "/split-tests" },
  { label: "Contacts", icon: Users, path: "/contacts" },
];

export function Sidebar({ orgId, orgName }: { orgId: string; orgName: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${orgId}`;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="text-lg font-bold tracking-tight">
          Funnel<span className="text-accent">Fuel</span>
        </div>
      </div>

      {/* Org name */}
      <div className="border-b border-border px-4 py-3">
        <p className="truncate text-xs font-medium text-text-muted">{orgName}</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map((item) => {
          const href = `${base}${item.path}`;
          const isActive =
            item.path === ""
              ? pathname === base || pathname === `${base}/`
              : pathname.startsWith(href);

          return (
            <Link
              key={item.path}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent-dim text-accent"
                  : "text-text-muted hover:bg-surface-elevated hover:text-text"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <p className="text-[11px] text-text-dim">FunnelFuel v0.1</p>
      </div>
    </aside>
  );
}
