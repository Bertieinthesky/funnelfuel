"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ExternalLink,
} from "lucide-react";

interface FeedEvent {
  id: string;
  type: string;
  source: string;
  confidence: number;
  data: unknown;
  timestamp: string | Date;
  contactId: string | null;
  contact: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    leadQuality: string;
    tags: string[];
  } | null;
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

const QUALITY_COLORS: Record<string, string> = {
  HIGH: "bg-green-dim text-green",
  MEDIUM: "bg-yellow-dim text-yellow",
  LOW: "bg-red-dim text-red",
  UNKNOWN: "bg-secondary text-muted-foreground/60",
};

function formatDataValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (key === "amountCents" || key === "amount_cents") {
    return `$${(Number(value) / 100).toFixed(2)}`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDataKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function EventFeed({ events, orgId }: { events: FeedEvent[]; orgId: string }) {
  const [filter, setFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<FeedEvent | null>(null);

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
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-border-bright cursor-pointer"
              onClick={() => setSelectedEvent(event)}
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

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        {selectedEvent && (() => {
          const config = eventConfig[selectedEvent.type] ?? eventConfig.CUSTOM;
          const Icon = config.icon;
          const data = selectedEvent.data as Record<string, unknown> | null;
          const contactName = selectedEvent.contact
            ? [selectedEvent.contact.firstName, selectedEvent.contact.lastName]
                .filter(Boolean)
                .join(" ")
            : null;

          return (
            <DialogContent className="max-w-lg gap-0 border-border bg-card p-0">
              <DialogHeader className="px-5 pt-5 pb-0">
                <DialogTitle className="flex items-center gap-3">
                  <div className={cn("rounded-lg p-2", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div>
                    <span className={cn("text-sm font-semibold", config.color)}>
                      {config.label}
                    </span>
                    <p className="text-xs font-normal text-muted-foreground/60">
                      {format(new Date(selectedEvent.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      {" · "}via {selectedEvent.source.replace("_WEBHOOK", "").toLowerCase()}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 px-5 py-4">
                {/* Contact Info */}
                {selectedEvent.contact && (
                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      Contact
                    </p>
                    <div className="space-y-1.5">
                      {contactName && (
                        <p className="text-sm font-medium text-foreground">{contactName}</p>
                      )}
                      {selectedEvent.contact.email && (
                        <p className="text-xs text-muted-foreground">{selectedEvent.contact.email}</p>
                      )}
                      {selectedEvent.contact.phone && (
                        <p className="text-xs text-muted-foreground">{selectedEvent.contact.phone}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px]", QUALITY_COLORS[selectedEvent.contact.leadQuality] || QUALITY_COLORS.UNKNOWN)}
                        >
                          {selectedEvent.contact.leadQuality.toLowerCase()}
                        </Badge>
                        {selectedEvent.contact.tags.length > 0 && selectedEvent.contact.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-primary/10 text-primary text-[10px] px-1.5 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {selectedEvent.contactId && (
                      <Button variant="outline" size="sm" asChild className="mt-3">
                        <Link href={`/dashboard/${orgId}/contacts/${selectedEvent.contactId}`}>
                          View Full Contact
                          <ExternalLink className="ml-1.5 h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                )}

                {/* Session Info */}
                {selectedEvent.session && (selectedEvent.session.ffSource || selectedEvent.session.landingPage) && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                        Session
                      </p>
                      <div className="space-y-1">
                        {(selectedEvent.session.ffSource || selectedEvent.session.utmSource) && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground/60">Source:</span>
                            <span className="text-foreground">
                              {selectedEvent.session.ffSource || selectedEvent.session.utmSource}
                            </span>
                          </div>
                        )}
                        {selectedEvent.session.landingPage && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground/60">Landing page:</span>
                            <span className="truncate text-foreground">{selectedEvent.session.landingPage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Submission Data */}
                {data && Object.keys(data).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                        Submission Data
                      </p>
                      <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
                        {Object.entries(data).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2 text-xs">
                            <span className="shrink-0 text-muted-foreground/60">
                              {formatDataKey(key)}:
                            </span>
                            <span className="text-foreground break-all">
                              {formatDataValue(key, value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Confidence */}
                <Separator />
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Confidence
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-secondary">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${selectedEvent.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedEvent.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}
