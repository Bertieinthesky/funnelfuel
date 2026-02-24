"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { format } from "date-fns";
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
  PAGE_VIEW: { text: "text-text-muted", bg: "bg-surface-elevated" },
  FORM_SUBMIT: { text: "text-blue", bg: "bg-blue-dim" },
  OPT_IN: { text: "text-green", bg: "bg-green-dim" },
  CHECKOUT_VIEW: { text: "text-yellow", bg: "bg-yellow-dim" },
  PURCHASE: { text: "text-green", bg: "bg-green-dim" },
  BOOKING: { text: "text-blue", bg: "bg-blue-dim" },
  BOOKING_CONFIRMED: { text: "text-green", bg: "bg-green-dim" },
  APPLICATION_SUBMIT: { text: "text-accent", bg: "bg-accent-dim" },
  WEBINAR_REGISTER: { text: "text-blue", bg: "bg-blue-dim" },
  WEBINAR_ATTEND: { text: "text-green", bg: "bg-green-dim" },
  WEBINAR_CTA_CLICK: { text: "text-accent", bg: "bg-accent-dim" },
  URL_RULE_MATCH: { text: "text-yellow", bg: "bg-yellow-dim" },
  CUSTOM: { text: "text-text-muted", bg: "bg-surface-elevated" },
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered =
    filter === "all" ? items : items.filter((i) => i.type === filter);

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
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === opt.value
                ? "bg-accent-dim text-accent"
                : "bg-surface text-text-muted hover:text-text"
            )}
          >
            {opt.label}
            {opt.value !== "all" && (
              <span className="ml-1 text-text-dim">
                ({items.filter((i) => i.type === opt.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 h-full w-px bg-border" />

        {filtered.map((item, i) => {
          const isExpanded = expanded.has(item.id);

          return (
            <div
              key={item.id}
              className="relative flex gap-3 pb-4"
            >
              {/* Dot on timeline */}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                {item.type === "session" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent bg-bg">
                    <Globe className="h-3.5 w-3.5 text-accent" />
                  </div>
                )}
                {item.type === "event" && (
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      eventColors[String(item.data.eventType)]?.bg ?? "bg-surface-elevated"
                    )}
                  >
                    {(() => {
                      const Icon = eventIcons[String(item.data.eventType)] ?? Zap;
                      return (
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5",
                            eventColors[String(item.data.eventType)]?.text ?? "text-text-muted"
                          )}
                        />
                      );
                    })()}
                  </div>
                )}
                {item.type === "page_view" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated">
                    <Eye className="h-3.5 w-3.5 text-text-dim" />
                  </div>
                )}
                {item.type === "payment" && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-dim">
                    <CreditCard className="h-3.5 w-3.5 text-green" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div
                className="flex-1 cursor-pointer rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-bright"
                onClick={() => toggle(item.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {renderLabel(item)}
                  </div>
                  <span className="text-[11px] text-text-dim">
                    {format(new Date(item.timestamp), "MMM d, h:mm a")}
                  </span>
                </div>
                {renderSummary(item)}
                {isExpanded && renderDetails(item)}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-text-muted">
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
          <span className="text-xs font-medium text-accent">New Session</span>
          <span className="rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] text-accent">
            {source}
          </span>
          {item.data.title && (
            <span className="text-[10px] text-text-dim">
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
            <span className="text-[10px] text-text-dim">
              in {String(item.data.funnel)}
            </span>
          )}
          {item.data.variant && (
            <span className="rounded-full bg-blue-dim px-1.5 py-0.5 text-[10px] text-blue">
              {String(item.data.variant)}
            </span>
          )}
        </>
      );
    }
    case "page_view":
      return (
        <span className="text-xs text-text-muted">
          Viewed <span className="font-medium text-text">{String(item.data.path)}</span>
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
      return <span className="text-xs text-text-muted">Unknown</span>;
  }
}

function renderSummary(item: TimelineItem) {
  if (item.type === "session" && item.data.landingPage) {
    return (
      <p className="mt-1 truncate text-[11px] text-text-dim">
        Landing: {String(item.data.landingPage)}
      </p>
    );
  }
  if (item.type === "page_view" && item.data.title) {
    return (
      <p className="mt-1 text-[11px] text-text-dim">{String(item.data.title)}</p>
    );
  }
  if (item.type === "payment" && item.data.product) {
    return (
      <p className="mt-1 text-[11px] text-text-dim">
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
    <div className="mt-2 space-y-1 border-t border-border pt-2">
      {details.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2 text-[11px]">
          <span className="text-text-dim">{key}:</span>
          <span className="truncate text-text-muted">{String(value)}</span>
        </div>
      ))}
      {/* Show nested objects like adClicks */}
      {Object.entries(item.data)
        .filter(([, v]) => v != null && typeof v === "object")
        .map(([key, value]) => (
          <div key={key} className="text-[11px]">
            <span className="text-text-dim">{key}:</span>
            <pre className="mt-0.5 overflow-x-auto rounded bg-bg p-1.5 text-[10px] text-text-dim">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
    </div>
  );
}
