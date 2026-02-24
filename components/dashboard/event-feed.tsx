"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  CreditCard,
  MousePointerClick,
  Eye,
  Calendar,
  CalendarCheck,
  FormInput,
  MonitorPlay,
  Video,
  Link2,
  Tag,
  Zap,
} from "lucide-react";

interface FeedEvent {
  id: string;
  type: string;
  source: string;
  confidence: number;
  data: unknown;
  timestamp: string | Date;
  contact: { email: string | null; firstName: string | null; lastName: string | null } | null;
  session: { ffSource: string | null; utmSource: string | null; landingPage: string | null } | null;
}

const eventConfig: Record<
  string,
  { icon: typeof FileText; label: string; color: string; bg: string }
> = {
  PAGE_VIEW: { icon: Eye, label: "Page View", color: "text-muted-foreground", bg: "bg-secondary" },
  FORM_SUBMIT: { icon: FormInput, label: "Form Submit", color: "text-blue", bg: "bg-blue-dim" },
  OPT_IN: { icon: MousePointerClick, label: "Opt-in", color: "text-green", bg: "bg-green-dim" },
  CHECKOUT_VIEW: { icon: Eye, label: "Checkout View", color: "text-yellow", bg: "bg-yellow-dim" },
  PURCHASE: { icon: CreditCard, label: "Purchase", color: "text-green", bg: "bg-green-dim" },
  BOOKING: { icon: Calendar, label: "Booking", color: "text-blue", bg: "bg-blue-dim" },
  BOOKING_CONFIRMED: { icon: CalendarCheck, label: "Booking Confirmed", color: "text-green", bg: "bg-green-dim" },
  APPLICATION_SUBMIT: { icon: FileText, label: "Application", color: "text-primary", bg: "bg-primary/10" },
  WEBINAR_REGISTER: { icon: MonitorPlay, label: "Webinar Register", color: "text-blue", bg: "bg-blue-dim" },
  WEBINAR_ATTEND: { icon: Video, label: "Webinar Attend", color: "text-green", bg: "bg-green-dim" },
  WEBINAR_CTA_CLICK: { icon: Link2, label: "Webinar CTA", color: "text-primary", bg: "bg-primary/10" },
  URL_RULE_MATCH: { icon: Tag, label: "URL Rule", color: "text-yellow", bg: "bg-yellow-dim" },
  CUSTOM: { icon: Zap, label: "Custom", color: "text-muted-foreground", bg: "bg-secondary" },
};

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Opt-ins", value: "OPT_IN,FORM_SUBMIT" },
  { label: "Purchases", value: "PURCHASE" },
  { label: "Bookings", value: "BOOKING,BOOKING_CONFIRMED" },
  { label: "Applications", value: "APPLICATION_SUBMIT" },
  { label: "Webinars", value: "WEBINAR_REGISTER,WEBINAR_ATTEND,WEBINAR_CTA_CLICK" },
];

export function EventFeed({ events }: { events: FeedEvent[] }) {
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? events
      : events.filter((e) => filter.split(",").includes(e.type));

  return (
    <div>
      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
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
          </Button>
        ))}
      </div>

      {/* Event list */}
      <div className="space-y-1.5">
        {filtered.length === 0 && (
          <Card className="border-border py-0">
            <div className="p-8 text-center text-sm text-muted-foreground">
              No events matching this filter yet.
            </div>
          </Card>
        )}
        {filtered.map((event) => {
          const config = eventConfig[event.type] ?? eventConfig.CUSTOM;
          const Icon = config.icon;
          const data = event.data as Record<string, unknown> | null;
          const contactName = event.contact
            ? [event.contact.firstName, event.contact.lastName]
                .filter(Boolean)
                .join(" ") || event.contact.email
            : null;
          const source =
            event.session?.ffSource || event.session?.utmSource || null;

          return (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-border-bright"
            >
              <div className={cn("rounded-lg p-1.5", config.bg)}>
                <Icon className={cn("h-3.5 w-3.5", config.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium", config.color)}>
                    {config.label}
                  </span>
                  {contactName && (
                    <span className="truncate text-xs text-foreground">
                      {contactName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                  {data?.email != null && (
                    <span className="truncate">{String(data.email)}</span>
                  )}
                  {data?.amountCents != null && (
                    <span className="text-green">
                      ${(Number(data.amountCents) / 100).toFixed(2)}
                    </span>
                  )}
                  {source && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {source}
                    </Badge>
                  )}
                  <span className="shrink-0">
                    via {event.source.replace("_WEBHOOK", "").toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[11px] text-muted-foreground/60">
                  {formatDistanceToNow(new Date(event.timestamp), {
                    addSuffix: true,
                  })}
                </p>
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  <div
                    className="h-1 rounded-full bg-primary"
                    style={{ width: `${event.confidence * 0.2}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground/60">
                    {event.confidence}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
