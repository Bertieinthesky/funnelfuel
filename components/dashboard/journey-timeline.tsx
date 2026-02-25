"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  FormInput,
  CreditCard,
  Calendar,
  CalendarCheck,
  FileText,
  MonitorPlay,
  Video,
  Link2,
  Tag,
  Zap,
  Globe,
  MousePointerClick,
  Filter,
} from "lucide-react";

interface TimelineItem {
  id: string;
  type: "session" | "event" | "page_view" | "payment";
  timestamp: string;
  data: Record<string, unknown>;
}

const eventIcons: Record<string, typeof Eye> = {
  PAGE_VIEW: Eye,
  FORM_SUBMIT: FormInput,
  OPT_IN: MousePointerClick,
  CHECKOUT_VIEW: Eye,
  PURCHASE: CreditCard,
  BOOKING: Calendar,
  BOOKING_CONFIRMED: CalendarCheck,
  APPLICATION_SUBMIT: FileText,
  WEBINAR_REGISTER: MonitorPlay,
  WEBINAR_ATTEND: Video,
  WEBINAR_CTA_CLICK: Link2,
  URL_RULE_MATCH: Tag,
  CUSTOM: Zap,
};

const eventColors: Record<string, { text: string; bg: string }> = {
  PAGE_VIEW: { text: "text-muted-foreground", bg: "bg-secondary" },
  FORM_SUBMIT: { text: "text-blue", bg: "bg-blue-dim" },
  OPT_IN: { text: "text-green", bg: "bg-green-dim" },
  CHECKOUT_VIEW: { text: "text-yellow", bg: "bg-yellow-dim" },
  PURCHASE: { text: "text-green", bg: "bg-green-dim" },
  BOOKING: { text: "text-blue", bg: "bg-blue-dim" },
  BOOKING_CONFIRMED: { text: "text-green", bg: "bg-green-dim" },
  APPLICATION_SUBMIT: { text: "text-primary", bg: "bg-primary/10" },
  WEBINAR_REGISTER: { text: "text-blue", bg: "bg-blue-dim" },
  WEBINAR_ATTEND: { text: "text-green", bg: "bg-green-dim" },
  WEBINAR_CTA_CLICK: { text: "text-primary", bg: "bg-primary/10" },
  URL_RULE_MATCH: { text: "text-yellow", bg: "bg-yellow-dim" },
  CUSTOM: { text: "text-muted-foreground", bg: "bg-secondary" },
};

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Sessions", value: "session" },
  { label: "Events", value: "event" },
  { label: "Pages", value: "page_view" },
  { label: "Payments", value: "payment" },
];

export function JourneyTimeline({ items }: { items: TimelineItem[] }) {
  const [filter, setFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Get unique event types for the dropdown
  const eventTypes = [
    ...new Set(
      items
        .filter((i) => i.type === "event")
        .map((i) => String(i.data.eventType))
    ),
  ].sort();

  let filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  // Event type sub-filter
  if (eventTypeFilter !== "all") {
    filtered = filtered.filter(
      (i) => i.type !== "event" || String(i.data.eventType) === eventTypeFilter
    );
  }

  // Date range filter
  if (dateFrom) {
    const from = new Date(dateFrom + "T00:00:00");
    filtered = filtered.filter((i) => new Date(i.timestamp) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo + "T23:59:59.999");
    filtered = filtered.filter((i) => new Date(i.timestamp) <= to);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {/* Filter chips */}
      <div className="mb-4 flex gap-1.5">
        {filterOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "ghost"}
            size="xs"
            onClick={() => setFilter(opt.value)}
            className={cn(
              "rounded-full",
              filter === opt.value
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
            {opt.value !== "all" && (
              <span className="ml-1 text-muted-foreground/60">
                ({items.filter((i) => i.type === opt.value).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Sub-filters: event type + date range */}
      {(eventTypes.length > 0 || items.length > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {eventTypes.length > 0 && (
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <Filter className="mr-1 h-3 w-3 text-muted-foreground/60" />
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {eventTypes.map((et) => (
                  <SelectItem key={et} value={et}>
                    {et.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-7 w-[140px] text-xs"
            placeholder="From"
          />
          <span className="text-[10px] text-muted-foreground/60">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-7 w-[140px] text-xs"
            placeholder="To"
          />
          {(eventTypeFilter !== "all" || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setEventTypeFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-[10px] text-muted-foreground/60 hover:text-foreground"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 h-full w-px bg-border" />

        {filtered.map((item) => {
          const isExpanded = expanded.has(item.id);

          return (
            <div
              key={item.id}
              className="relative flex gap-3 pb-4"
            >
              {/* Dot on timeline */}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                {item.type === "session" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                {item.type === "event" && (
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      eventColors[String(item.data.eventType)]?.bg ?? "bg-secondary"
                    )}
                  >
                    {(() => {
                      const Icon = eventIcons[String(item.data.eventType)] ?? Zap;
                      return (
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5",
                            eventColors[String(item.data.eventType)]?.text ?? "text-muted-foreground"
                          )}
                        />
                      );
                    })()}
                  </div>
                )}
                {item.type === "page_view" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
                {item.type === "payment" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-dim">
                    <CreditCard className="h-3.5 w-3.5 text-green" />
                  </div>
                )}
              </div>

              {/* Content */}
              <Card
                className="flex-1 cursor-pointer gap-0 border-border py-0 transition-all duration-200 hover:border-border-bright"
                onClick={() => toggle(item.id)}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {renderLabel(item)}
                    </div>
                    <span className="text-[11px] text-muted-foreground/60">
                      {format(new Date(item.timestamp), "MMM d, h:mm a")}
                    </span>
                  </div>
                  {renderSummary(item)}
                  {isExpanded && renderDetails(item)}
                </div>
              </Card>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No journey events matching this filter.
          </div>
        )}
      </div>
    </div>
  );
}

function renderLabel(item: TimelineItem) {
  switch (item.type) {
    case "session": {
      const source = String(item.data.source || "direct");
      return (
        <>
          <span className="text-xs font-medium text-primary">New Session</span>
          <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">
            {source}
          </Badge>
          {item.data.title && (
            <span className="text-[10px] text-muted-foreground/60">
              {String(item.data.title)}
            </span>
          )}
        </>
      );
    }
    case "event": {
      const eventType = String(item.data.eventType);
      const color = eventColors[eventType] ?? eventColors.CUSTOM;
      return (
        <>
          <span className={cn("text-xs font-medium", color.text)}>
            {eventType.replace(/_/g, " ")}
          </span>
          {item.data.funnel && (
            <span className="text-[10px] text-muted-foreground/60">
              in {String(item.data.funnel)}
            </span>
          )}
          {item.data.variant && (
            <Badge variant="secondary" className="bg-blue-dim text-blue text-[10px]">
              {String(item.data.variant)}
            </Badge>
          )}
        </>
      );
    }
    case "page_view":
      return (
        <span className="text-xs text-muted-foreground">
          Viewed <span className="font-medium text-foreground">{String(item.data.path)}</span>
        </span>
      );
    case "payment":
      return (
        <>
          <span className="text-xs font-medium text-green">Payment</span>
          <span className="text-xs font-semibold text-green">
            ${Number(item.data.amount).toFixed(2)} {String(item.data.currency).toUpperCase()}
          </span>
        </>
      );
    default:
      return <span className="text-xs text-muted-foreground">Unknown</span>;
  }
}

function renderSummary(item: TimelineItem) {
  if (item.type === "session" && item.data.landingPage) {
    return (
      <p className="mt-1 truncate text-[11px] text-muted-foreground/60">
        Landing: {String(item.data.landingPage)}
      </p>
    );
  }
  if (item.type === "page_view" && item.data.title) {
    return (
      <p className="mt-1 text-[11px] text-muted-foreground/60">{String(item.data.title)}</p>
    );
  }
  if (item.type === "payment" && item.data.product) {
    return (
      <p className="mt-1 text-[11px] text-muted-foreground/60">
        {String(item.data.product)} via {String(item.data.processor)}
      </p>
    );
  }
  return null;
}

function renderDetails(item: TimelineItem) {
  const details = Object.entries(item.data).filter(
    ([, v]) => v != null && v !== "" && typeof v !== "object"
  );

  if (details.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 pt-2">
      <Separator className="mb-2" />
      {details.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground/60">{key}:</span>
          <span className="truncate text-muted-foreground">{String(value)}</span>
        </div>
      ))}
      {Object.entries(item.data)
        .filter(([, v]) => v != null && typeof v === "object")
        .map(([key, value]) => (
          <div key={key} className="text-[11px]">
            <span className="text-muted-foreground/60">{key}:</span>
            <pre className="mt-0.5 overflow-x-auto rounded-md bg-background p-1.5 text-[10px] text-muted-foreground/60">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
    </div>
  );
}
