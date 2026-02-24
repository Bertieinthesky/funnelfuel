"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const TIMELINE_OPTIONS = [
  { label: "3d", value: 3 },
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const EVENT_TYPES = [
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

interface ContactsChartProps {
  orgId: string;
  tags: string[];
}

interface ChartDataPoint {
  date: string;
  count: number;
}

export function ContactsChart({ orgId, tags }: ContactsChartProps) {
  const [days, setDays] = useState(3);
  const [eventType, setEventType] = useState("all");
  const [tag, setTag] = useState("all");
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (eventType !== "all") params.set("eventType", eventType);
      if (tag !== "all") params.set("tag", tag);

      const res = await fetch(
        `/api/dashboard/${orgId}/contacts/chart?${params.toString()}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, days, eventType, tag]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <Card className="gap-0 border-border py-0">
      <CardContent className="p-4">
        {/* Controls row */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            New Contacts
          </p>

          <div className="flex gap-1">
            {TIMELINE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={days === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(opt.value)}
                className="text-xs px-2.5"
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {tags.length > 0 && (
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger size="sm" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {loading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/60" />
          )}
        </div>

        {/* Chart */}
        <div className="animate-fade-in">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={data}
              margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
            >
              <defs>
                <linearGradient id="contactsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6600" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ff6600" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                allowDecimals={false}
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
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(value) => [(value ?? 0).toLocaleString(), "Contacts"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#ff6600"
                strokeWidth={2}
                fill="url(#contactsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
