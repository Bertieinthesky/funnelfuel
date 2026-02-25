"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const presets = [
  { label: "Today", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "All", value: "all" },
];

function formatForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DateRangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("range") || "30d";
  const isCustom = current.includes("_");

  const [showCustom, setShowCustom] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse existing custom range or default to last 30 days
  const today = new Date();
  let defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  let defaultTo = new Date(today);

  if (isCustom) {
    const [fromStr, toStr] = current.split("_");
    defaultFrom = new Date(fromStr);
    defaultTo = new Date(toStr);
  }

  const [fromDate, setFromDate] = useState(formatForInput(defaultFrom));
  const [toDate, setToDate] = useState(formatForInput(defaultTo));

  function setRange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`?${params.toString()}`);
    setShowCustom(false);
  }

  function applyCustomRange() {
    if (!fromDate || !toDate) return;
    setRange(`${fromDate}_${toDate}`);
  }

  // Close popover on outside click
  useEffect(() => {
    if (!showCustom) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCustom]);

  // Custom range display label
  const customLabel = isCustom
    ? `${current.split("_")[0]} — ${current.split("_")[1]}`
    : null;

  return (
    <div className="flex items-center gap-2">
      <Tabs
        value={isCustom ? "" : current}
        onValueChange={setRange}
      >
        <TabsList className="h-8">
          {presets.map((preset) => (
            <TabsTrigger
              key={preset.value}
              value={preset.value}
              className="px-3 text-xs"
            >
              {preset.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Custom range button + popover */}
      <div className="relative">
        <Button
          variant={isCustom ? "default" : "ghost"}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setShowCustom(!showCustom)}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {customLabel ?? "Custom"}
        </Button>

        {showCustom && (
          <div
            ref={popoverRef}
            className="absolute right-0 top-full z-50 mt-1.5 rounded-lg border border-border bg-card p-3 shadow-lg animate-fade-in"
          >
            <div className="flex items-end gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={applyCustomRange}
                disabled={!fromDate || !toDate}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
