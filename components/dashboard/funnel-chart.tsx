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

interface Props {
  orgId: string;
  funnelId: string;
  range?: string;
}

interface DataPoint {
  date: string;
  events: number;
  revenue: number;
}

export function FunnelChart({ orgId, funnelId, range }: Props) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<"events" | "revenue">("events");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (range) params.set("range", range);
      const res = await fetch(
        `/api/dashboard/${orgId}/funnels/${funnelId}/chart?${params}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, funnelId, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartColor = metric === "revenue" ? "#22c55e" : "#ff6600";

  return (
    <Card className="gap-0 border-border py-0">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Trend</h3>
          <Select
            value={metric}
            onValueChange={(v) => setMetric(v as "events" | "revenue")}
          >
            <SelectTrigger className="w-[130px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="events">Events</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
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
                width={45}
                tickFormatter={(v) =>
                  metric === "revenue"
                    ? `$${v.toLocaleString()}`
                    : v.toLocaleString()
                }
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
                formatter={(value) => [
                  metric === "revenue"
                    ? `$${(value as number).toLocaleString()}`
                    : (value as number).toLocaleString(),
                  metric === "revenue" ? "Revenue" : "Events",
                ]}
              />
              <Area
                type="monotone"
                dataKey={metric}
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
