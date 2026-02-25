"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

const presets = [
  { label: "Today", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "All", value: "all" },
];

function formatForParam(date: Date): string {
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

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: defaultFrom,
    to: defaultTo,
  });

  function setRange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`?${params.toString()}`);
    setShowCustom(false);
  }

  function applyCustomRange() {
    if (!dateRange?.from || !dateRange?.to) return;
    setRange(`${formatForParam(dateRange.from)}_${formatForParam(dateRange.to)}`);
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
    ? `${format(defaultFrom, "MMM d")} — ${format(defaultTo, "MMM d")}`
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

      {/* Custom range button + calendar popover */}
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
            className="absolute right-0 top-full z-50 mt-1.5 rounded-lg border border-border bg-card shadow-lg animate-fade-in"
          >
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              defaultMonth={
                dateRange?.from
                  ? new Date(dateRange.from.getFullYear(), dateRange.from.getMonth() - 1)
                  : undefined
              }
              disabled={{ after: today }}
            />
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, "MMM d, yyyy")} — ${format(dateRange.to, "MMM d, yyyy")}`
                  : "Select a date range"}
              </p>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={applyCustomRange}
                disabled={!dateRange?.from || !dateRange?.to}
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
