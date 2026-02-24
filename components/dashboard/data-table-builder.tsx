"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { Download, Loader2, ArrowUpDown } from "lucide-react";

const DIMENSIONS = [
  { id: "source", label: "Source" },
  { id: "tag", label: "Tag" },
  { id: "eventType", label: "Event Type" },
  { id: "funnel", label: "Funnel" },
  { id: "variant", label: "Variant" },
  { id: "date", label: "Date" },
] as const;

const METRICS = [
  { id: "contacts", label: "Contacts", format: "number", default: true },
  { id: "sessions", label: "Sessions", format: "number", default: false },
  { id: "optIns", label: "Opt-ins", format: "number", default: true },
  { id: "formSubmits", label: "Form Submits", format: "number", default: false },
  { id: "applications", label: "Applications", format: "number", default: true },
  { id: "bookings", label: "Bookings", format: "number", default: false },
  { id: "webinarRegistrations", label: "Webinar Reg.", format: "number", default: false },
  { id: "webinarAttendees", label: "Webinar Attend.", format: "number", default: false },
  { id: "purchases", label: "Sales", format: "number", default: true },
  { id: "revenue", label: "Revenue", format: "currency", default: true },
  { id: "convRate", label: "Conv. Rate", format: "percent", default: false },
] as const;

const DATE_RANGES = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "All time", value: "all" },
];

interface FilterOptions {
  sources: string[];
  tags: string[];
  funnels: { id: string; name: string }[];
  experiments: { id: string; name: string }[];
}

interface DataTableRow {
  dimension: string;
  [key: string]: string | number;
}

interface DataTableResult {
  rows: DataTableRow[];
  totals: Record<string, number>;
}

export function DataTableBuilder({
  orgId,
  filterOptions,
}: {
  orgId: string;
  filterOptions: FilterOptions;
}) {
  const [groupBy, setGroupBy] = useState("source");
  const [dateRange, setDateRange] = useState("30d");
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(METRICS.filter((m) => m.default).map((m) => m.id))
  );
  const [tagFilter, setTagFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [funnelFilter, setFunnelFilter] = useState("");
  const [experimentFilter, setExperimentFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DataTableResult | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleMetric(id: string) {
    setSelectedMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getDateFilter() {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return {
          dateFrom: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
        };
      case "7d":
        return { dateFrom: new Date(now.getTime() - 7 * 86400000).toISOString() };
      case "30d":
        return { dateFrom: new Date(now.getTime() - 30 * 86400000).toISOString() };
      case "90d":
        return { dateFrom: new Date(now.getTime() - 90 * 86400000).toISOString() };
      default:
        return {};
    }
  }

  async function generate() {
    setLoading(true);
    try {
      const { dateFrom } = getDateFilter();
      const res = await fetch(`/api/dashboard/${orgId}/data-table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupBy,
          metrics: Array.from(selectedMetrics),
          filters: {
            ...(dateFrom ? { dateFrom } : {}),
            ...(tagFilter ? { tags: [tagFilter] } : {}),
            ...(sourceFilter ? { sources: [sourceFilter] } : {}),
            ...(funnelFilter ? { funnelId: funnelFilter } : {}),
            ...(experimentFilter ? { experimentId: experimentFilter } : {}),
            ...(qualityFilter ? { leadQuality: qualityFilter } : {}),
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setSortCol(null);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  function getSortedRows() {
    if (!results) return [];
    if (!sortCol) return results.rows;
    return [...results.rows].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  function exportCSV() {
    if (!results) return;
    const activeMetrics = METRICS.filter((m) => selectedMetrics.has(m.id));
    const headers = [getDimensionLabel(), ...activeMetrics.map((m) => m.label)];
    const csvRows = getSortedRows().map((row) => [
      row.dimension,
      ...activeMetrics.map((m) => row[m.id]),
    ]);
    csvRows.push(["TOTAL", ...activeMetrics.map((m) => results.totals[m.id] ?? 0)]);

    const csv = [
      headers.join(","),
      ...csvRows.map((r) =>
        r
          .map((v) => {
            const s = String(v);
            return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-table-${groupBy}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getDimensionLabel() {
    return DIMENSIONS.find((d) => d.id === groupBy)?.label || groupBy;
  }

  function formatValue(value: number | string, metricId: string) {
    if (typeof value !== "number") return value;
    const metric = METRICS.find((m) => m.id === metricId);
    if (metric?.format === "currency")
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (metric?.format === "percent") return `${value.toFixed(2)}%`;
    return value.toLocaleString();
  }

  const activeMetrics = METRICS.filter((m) => selectedMetrics.has(m.id));

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
        {/* Row 1: Group By + Date Range */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-dim">
              GROUP ROWS BY
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            >
              {DIMENSIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-dim">
              DATE RANGE
            </label>
            <div className="flex gap-1">
              {DATE_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setDateRange(r.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    dateRange === r.value
                      ? "bg-accent text-white"
                      : "border border-border bg-bg text-text-muted hover:text-text"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Filters */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-text-dim">
            FILTERS
          </label>
          <div className="flex flex-wrap gap-2">
            {filterOptions.tags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className={cn(
                  "rounded-md border border-border bg-bg px-3 py-1.5 text-xs focus:border-accent focus:outline-none",
                  tagFilter ? "text-accent" : "text-text-muted"
                )}
              >
                <option value="">All Tags</option>
                {filterOptions.tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
            {filterOptions.sources.length > 0 && (
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className={cn(
                  "rounded-md border border-border bg-bg px-3 py-1.5 text-xs focus:border-accent focus:outline-none",
                  sourceFilter ? "text-accent" : "text-text-muted"
                )}
              >
                <option value="">All Sources</option>
                {filterOptions.sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            {filterOptions.funnels.length > 0 && (
              <select
                value={funnelFilter}
                onChange={(e) => setFunnelFilter(e.target.value)}
                className={cn(
                  "rounded-md border border-border bg-bg px-3 py-1.5 text-xs focus:border-accent focus:outline-none",
                  funnelFilter ? "text-accent" : "text-text-muted"
                )}
              >
                <option value="">All Funnels</option>
                {filterOptions.funnels.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
            {filterOptions.experiments.length > 0 && (
              <select
                value={experimentFilter}
                onChange={(e) => setExperimentFilter(e.target.value)}
                className={cn(
                  "rounded-md border border-border bg-bg px-3 py-1.5 text-xs focus:border-accent focus:outline-none",
                  experimentFilter ? "text-accent" : "text-text-muted"
                )}
              >
                <option value="">All Experiments</option>
                {filterOptions.experiments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className={cn(
                "rounded-md border border-border bg-bg px-3 py-1.5 text-xs focus:border-accent focus:outline-none",
                qualityFilter ? "text-accent" : "text-text-muted"
              )}
            >
              <option value="">All Quality</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>
        </div>

        {/* Row 3: Metrics */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-text-dim">
            COLUMNS
          </label>
          <div className="flex flex-wrap gap-2">
            {METRICS.map((m) => (
              <label
                key={m.id}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                  selectedMetrics.has(m.id)
                    ? "border-accent bg-accent-dim text-accent"
                    : "border-border text-text-muted hover:text-text"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedMetrics.has(m.id)}
                  onChange={() => toggleMetric(m.id)}
                  className="sr-only"
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={generate}
          disabled={loading || selectedMetrics.size === 0}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating...
            </span>
          ) : (
            "Generate Table"
          )}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {results.rows.length} row{results.rows.length !== 1 ? "s" : ""}
              {(groupBy === "tag" || groupBy === "eventType") && (
                <span className="ml-1 text-text-dim">
                  (contacts may appear in multiple groups)
                </span>
              )}
            </p>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
          </div>

          {results.rows.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-muted">
              No data matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium text-text-muted transition-colors hover:text-text"
                      onClick={() => handleSort("dimension")}
                    >
                      <span className="flex items-center gap-1">
                        {getDimensionLabel()}
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </th>
                    {activeMetrics.map((m) => (
                      <th
                        key={m.id}
                        className="cursor-pointer px-4 py-3 text-right text-xs font-medium text-text-muted transition-colors hover:text-text"
                        onClick={() => handleSort(m.id)}
                      >
                        <span className="flex items-center justify-end gap-1">
                          {m.label}
                          <ArrowUpDown className="h-3 w-3" />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getSortedRows().map((row) => (
                    <tr
                      key={row.dimension}
                      className="border-b border-border transition-colors last:border-0 hover:bg-surface-elevated/50"
                    >
                      <td className="px-4 py-3 font-medium">{row.dimension}</td>
                      {activeMetrics.map((m) => (
                        <td
                          key={m.id}
                          className={cn(
                            "px-4 py-3 text-right tabular-nums",
                            m.format === "currency" ? "text-green" : "text-text-muted"
                          )}
                        >
                          {formatValue(row[m.id] as number, m.id)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-bg">
                    <td className="px-4 py-3 text-xs font-semibold text-text-dim">TOTAL</td>
                    {activeMetrics.map((m) => (
                      <td
                        key={m.id}
                        className={cn(
                          "px-4 py-3 text-right text-xs font-semibold tabular-nums",
                          m.format === "currency" ? "text-green" : "text-text-dim"
                        )}
                      >
                        {formatValue(results.totals[m.id] ?? 0, m.id)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
