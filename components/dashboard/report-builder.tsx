"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { Download, Loader2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const DIMENSIONS = [
  { id: "source", label: "Source" },
  { id: "title", label: "Title" },
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
  titles: string[];
  tags: string[];
  funnels: { id: string; name: string }[];
  experiments: { id: string; name: string }[];
  segments?: { id: string; name: string }[];
}

interface ReportRow {
  dimension: string;
  [key: string]: string | number;
}

interface ReportResult {
  rows: ReportRow[];
  totals: Record<string, number>;
}

export function ReportBuilder({
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
  const [titleFilter, setTitleFilter] = useState("");
  const [funnelFilter, setFunnelFilter] = useState("");
  const [experimentFilter, setExperimentFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ReportResult | null>(null);
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
      const res = await fetch(`/api/dashboard/${orgId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupBy,
          metrics: Array.from(selectedMetrics),
          filters: {
            ...(dateFrom ? { dateFrom } : {}),
            ...(tagFilter ? { tags: [tagFilter] } : {}),
            ...(sourceFilter ? { sources: [sourceFilter] } : {}),
            ...(titleFilter ? { titles: [titleFilter] } : {}),
            ...(funnelFilter ? { funnelId: funnelFilter } : {}),
            ...(experimentFilter ? { experimentId: experimentFilter } : {}),
            ...(segmentFilter ? { segmentId: segmentFilter } : {}),
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
    a.download = `report-${groupBy}-${new Date().toISOString().split("T")[0]}.csv`;
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

  // Find the first non-percent metric for the chart
  const chartMetric = METRICS.find(
    (m) => selectedMetrics.has(m.id) && m.format !== "percent"
  );

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="gap-0 border-border py-0">
        <CardContent className="space-y-4 p-4">
          {/* Row 1: Group By + Date Range */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Group rows by
              </label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSIONS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Date range
              </label>
              <div className="flex gap-1">
                {DATE_RANGES.map((r) => (
                  <Button
                    key={r.value}
                    variant={dateRange === r.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange(r.value)}
                    className="text-xs"
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Filters */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Filters
            </label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.tags.length > 0 && (
                <Select value={tagFilter || "all"} onValueChange={(v) => setTagFilter(v === "all" ? "" : v)}>
                  <SelectTrigger size="sm" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {filterOptions.tags.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {filterOptions.sources.length > 0 && (
                <Select value={sourceFilter || "all"} onValueChange={(v) => setSourceFilter(v === "all" ? "" : v)}>
                  <SelectTrigger size="sm" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {filterOptions.sources.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {filterOptions.titles.length > 0 && (
                <Select value={titleFilter || "all"} onValueChange={(v) => setTitleFilter(v === "all" ? "" : v)}>
                  <SelectTrigger size="sm" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Titles</SelectItem>
                    {filterOptions.titles.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {filterOptions.funnels.length > 0 && (
                <Select value={funnelFilter || "all"} onValueChange={(v) => setFunnelFilter(v === "all" ? "" : v)}>
                  <SelectTrigger size="sm" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funnels</SelectItem>
                    {filterOptions.funnels.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {filterOptions.experiments.length > 0 && (
                <Select value={experimentFilter || "all"} onValueChange={(v) => setExperimentFilter(v === "all" ? "" : v)}>
                  <SelectTrigger size="sm" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Experiments</SelectItem>
                    {filterOptions.experiments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {filterOptions.segments && filterOptions.segments.length > 0 && (
                <Select value={segmentFilter || "all"} onValueChange={(v) => setSegmentFilter(v === "all" ? "" : v)}>
                  <SelectTrigger size="sm" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Segments</SelectItem>
                    {filterOptions.segments.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={qualityFilter || "all"} onValueChange={(v) => setQualityFilter(v === "all" ? "" : v)}>
                <SelectTrigger size="sm" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quality</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="UNKNOWN">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Metrics */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Columns
            </label>
            <div className="flex flex-wrap gap-2">
              {METRICS.map((m) => (
                <Badge
                  key={m.id}
                  variant={selectedMetrics.has(m.id) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedMetrics.has(m.id)
                      ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                      : "hover:bg-secondary"
                  )}
                  onClick={() => toggleMetric(m.id)}
                >
                  {m.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Generate */}
          <Button
            onClick={generate}
            disabled={loading || selectedMetrics.size === 0}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating...
              </span>
            ) : (
              "Generate Report"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {results.rows.length} row{results.rows.length !== 1 ? "s" : ""}
              {(groupBy === "tag" || groupBy === "eventType") && (
                <span className="ml-1 text-muted-foreground/60">
                  (contacts may appear in multiple groups)
                </span>
              )}
            </p>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
          </div>

          {/* Bar Chart */}
          {results.rows.length > 0 && chartMetric && (() => {
            const chartData = getSortedRows().slice(0, 20).map((row) => ({
              name: String(row.dimension).length > 20
                ? String(row.dimension).slice(0, 17) + "..."
                : String(row.dimension),
              value: Number(row[chartMetric.id]) || 0,
              fullName: String(row.dimension),
            }));

            return (
              <Card className="gap-0 border-border py-0">
                <CardContent className="p-4">
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    {chartMetric.label} by {getDimensionLabel()}
                  </p>
                  <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        axisLine={{ stroke: "var(--border)" }}
                        tickLine={false}
                        tickFormatter={(v: number) =>
                          chartMetric.format === "currency"
                            ? `$${v.toLocaleString()}`
                            : v.toLocaleString()
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: 12,
                          color: "var(--foreground)",
                        }}
                        formatter={(value) => {
                          const v = Number(value ?? 0);
                          return [
                            chartMetric.format === "currency"
                              ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : v.toLocaleString(),
                            chartMetric.label,
                          ];
                        }}
                        labelFormatter={(label) => {
                          const s = String(label);
                          const item = chartData.find((d) => d.name === s);
                          return item?.fullName || s;
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                        {chartData.map((_, index) => (
                          <Cell key={index} fill="#ff6600" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            );
          })()}

          {results.rows.length === 0 ? (
            <Card className="border-border py-0">
              <div className="p-8 text-center text-sm text-muted-foreground">
                No data matching your filters.
              </div>
            </Card>
          ) : (
            <Card className="gap-0 border-border py-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead
                      className="cursor-pointer px-4 text-xs transition-colors hover:text-foreground"
                      onClick={() => handleSort("dimension")}
                    >
                      <span className="flex items-center gap-1">
                        {getDimensionLabel()}
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    {activeMetrics.map((m) => (
                      <TableHead
                        key={m.id}
                        className="cursor-pointer px-4 text-right text-xs transition-colors hover:text-foreground"
                        onClick={() => handleSort(m.id)}
                      >
                        <span className="flex items-center justify-end gap-1">
                          {m.label}
                          <ArrowUpDown className="h-3 w-3" />
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedRows().map((row) => (
                    <TableRow key={row.dimension} className="border-border">
                      <TableCell className="px-4 font-medium">{row.dimension}</TableCell>
                      {activeMetrics.map((m) => (
                        <TableCell
                          key={m.id}
                          className={cn(
                            "px-4 text-right tabular-nums",
                            m.format === "currency" ? "text-green" : "text-muted-foreground"
                          )}
                        >
                          {formatValue(row[m.id] as number, m.id)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-background border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="px-4 text-xs font-semibold text-muted-foreground/60">TOTAL</TableCell>
                    {activeMetrics.map((m) => (
                      <TableCell
                        key={m.id}
                        className={cn(
                          "px-4 text-right text-xs font-semibold tabular-nums",
                          m.format === "currency" ? "text-green" : "text-muted-foreground/60"
                        )}
                      >
                        {formatValue(results.totals[m.id] ?? 0, m.id)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              </Table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
