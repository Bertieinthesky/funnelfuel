"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { Search, X, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContactFiltersProps {
  orgId: string;
  sources: string[];
  titles: string[];
  tags: string[];
  segments?: { id: string; name: string }[];
}

const eventTypes = [
  { label: "All Events", value: "all" },
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
  { label: "All Quality", value: "all" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
  { label: "Unknown", value: "UNKNOWN" },
];

export function ContactFilters({ orgId, sources, titles, tags, segments }: ContactFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
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
    searchParams.get("tag") ||
    searchParams.get("eventType") ||
    searchParams.get("quality") ||
    searchParams.get("segment") ||
    searchParams.get("range");

  const exportUrl = `/api/dashboard/${orgId}/contacts/export?${searchParams.toString()}`;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
        <Button variant="outline" size="default" asChild>
          <a href={exportUrl} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </Button>
      </form>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={searchParams.get("eventType") || "all"}
          onValueChange={(v) => setParam("eventType", v)}
        >
          <SelectTrigger size="sm" className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("quality") || "all"}
          onValueChange={(v) => setParam("quality", v)}
        >
          <SelectTrigger size="sm" className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {qualityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {tags.length > 0 && (
          <Select
            value={searchParams.get("tag") || "all"}
            onValueChange={(v) => setParam("tag", v)}
          >
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {sources.length > 0 && (
          <Select
            value={searchParams.get("source") || "all"}
            onValueChange={(v) => setParam("source", v)}
          >
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {titles.length > 0 && (
          <Select
            value={searchParams.get("title") || "all"}
            onValueChange={(v) => setParam("title", v)}
          >
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Titles</SelectItem>
              {titles.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {segments && segments.length > 0 && (
          <Select
            value={searchParams.get("segment") || "all"}
            onValueChange={(v) => setParam("segment", v)}
          >
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              {segments.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date range presets */}
        <Select
          value={searchParams.get("range") || "all"}
          onValueChange={(v) => setParam("range", v)}
        >
          <SelectTrigger size="sm" className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="xs"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
