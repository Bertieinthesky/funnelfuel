"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { format, parseISO } from "date-fns";

interface MetricOption {
  id: string;
  name: string;
  kind: string;
  format: string;
}

interface Props {
  orgId: string;
  funnelId: string;
  range?: string;
  metrics?: MetricOption[];
}

interface DataPoint {
  date: string;
  [key: string]: string | number;
}

const METRIC_COLORS: Record<string, string> = {
  events: "#ff6600",
  revenue: "#22c55e",
  CURRENCY: "#22c55e",
  PERCENTAGE: "#3b82f6",
  NUMBER: "#ff6600",
};

export function FunnelChart({ orgId, funnelId, range, metrics = [] }: Props) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("events");

  // Find the selected metric object (if it's an org metric)
  const selectedMetric = metrics.find((m) => m.id === selected);
  const isBuiltin = selected === "events" || selected === "revenue";
  const dataKey = isBuiltin ? selected : "value";

  const chartColor = isBuiltin
    ? METRIC_COLORS[selected]
    : METRIC_COLORS[selectedMetric?.format ?? "NUMBER"];

  const formatValue = useCallback(
    (v: number) => {
      if (selected === "revenue" || selectedMetric?.format === "CURRENCY") {
        return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      }
      if (selectedMetric?.format === "PERCENTAGE") {
        return `${(v * 100).toFixed(1)}%`;
      }
      return v.toLocaleString();
    },
    [selected, selectedMetric]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (range) params.set("range", range);
      if (!isBuiltin) params.set("metricId", selected);
      const res = await fetch(
        `/api/dashboard/${orgId}/funnels/${funnelId}/chart?${params}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, funnelId, range, selected, isBuiltin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayName = isBuiltin
    ? selected === "revenue"
      ? "Revenue"
      : "Events"
    : selectedMetric?.name ?? selected;

  return (
    <Card className="gap-0 border-border py-0">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Trend</h3>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[180px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="events">Events</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              {metrics.length > 0 && (
                <>
                  <div className="my-1 border-t border-border" />
                  {metrics.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop
                    offset="100%"
                    stopColor={chartColor}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(d) => format(parseISO(d), "MMM d")}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(v) => formatValue(v)}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "#111111",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(label) =>
                  format(parseISO(label as string), "MMM d, yyyy")
                }
                formatter={(value) => [formatValue(value as number), displayName]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#funnelGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
