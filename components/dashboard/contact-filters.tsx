"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { Search, X } from "lucide-react";
import { useState } from "react";

interface ContactFiltersProps {
  sources: string[];
  titles: string[];
}

const eventTypes = [
  { label: "All Events", value: "" },
  { label: "Form Submit", value: "FORM_SUBMIT" },
  { label: "Opt-in", value: "OPT_IN" },
  { label: "Purchase", value: "PURCHASE" },
  { label: "Booking", value: "BOOKING" },
  { label: "Booking Confirmed", value: "BOOKING_CONFIRMED" },
  { label: "Application", value: "APPLICATION_SUBMIT" },
  { label: "Webinar Register", value: "WEBINAR_REGISTER" },
  { label: "Webinar Attend", value: "WEBINAR_ATTEND" },
];

const qualityOptions = [
  { label: "All Quality", value: "" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
  { label: "Unknown", value: "UNKNOWN" },
];

export function ContactFilters({ sources, titles }: ContactFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset to page 1 on filter change
    router.push(`?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setParam("q", searchInput);
  }

  function clearFilters() {
    setSearchInput("");
    router.push("?");
  }

  const hasFilters =
    searchParams.get("q") ||
    searchParams.get("source") ||
    searchParams.get("title") ||
    searchParams.get("eventType") ||
    searchParams.get("quality") ||
    searchParams.get("range");

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={searchParams.get("eventType") || ""}
          onChange={(v) => setParam("eventType", v)}
          options={eventTypes}
        />
        <FilterSelect
          value={searchParams.get("quality") || ""}
          onChange={(v) => setParam("quality", v)}
          options={qualityOptions}
        />
        {sources.length > 0 && (
          <FilterSelect
            value={searchParams.get("source") || ""}
            onChange={(v) => setParam("source", v)}
            options={[
              { label: "All Sources", value: "" },
              ...sources.map((s) => ({ label: s, value: s })),
            ]}
          />
        )}
        {titles.length > 0 && (
          <FilterSelect
            value={searchParams.get("title") || ""}
            onChange={(v) => setParam("title", v)}
            options={[
              { label: "All Titles", value: "" },
              ...titles.map((t) => ({ label: t, value: t })),
            ]}
          />
        )}

        {/* Date range presets */}
        <FilterSelect
          value={searchParams.get("range") || ""}
          onChange={(v) => setParam("range", v)}
          options={[
            { label: "All Time", value: "" },
            { label: "Today", value: "today" },
            { label: "Last 7 days", value: "7d" },
            { label: "Last 30 days", value: "30d" },
            { label: "Last 90 days", value: "90d" },
          ]}
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border border-border bg-surface px-3 py-1.5 text-xs transition-colors focus:border-accent focus:outline-none",
        value ? "text-accent" : "text-text-muted"
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
