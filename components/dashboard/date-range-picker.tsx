"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const presets = [
  { label: "Today", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "All", value: "all" },
];

export function DateRangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("range") || "30d";

  function setRange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      {presets.map((preset) => (
        <button
          key={preset.value}
          onClick={() => setRange(preset.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            current === preset.value
              ? "bg-accent-dim text-accent"
              : "text-text-muted hover:text-text"
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

export function parseDateRange(range: string | null): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (range) {
    case "today": {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from, to };
    }
    case "7d": {
      const from = new Date(to);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "90d": {
      const from = new Date(to);
      from.setDate(from.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "all": {
      return { from: new Date(2020, 0, 1), to };
    }
    case "30d":
    default: {
      const from = new Date(to);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
  }
}
