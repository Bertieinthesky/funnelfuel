import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getContactDetail, getContactJourney } from "@/lib/dashboard/queries";
import { JourneyTimeline } from "@/components/dashboard/journey-timeline";
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import Link from "next/link";
import {
  ChevronRight,
  Mail,
  Phone,
  User,
  DollarSign,
  Activity,
  Globe,
  CreditCard,
} from "lucide-react";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; contactId: string }>;
}) {
  const { orgId, contactId } = await params;

  const [contact, journey] = await Promise.all([
    getContactDetail(orgId, contactId),
    getContactJourney(orgId, contactId),
  ]);

  if (!contact) notFound();

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const firstSession = journey.sessions[journey.sessions.length - 1];
  const firstSource = firstSession?.ffSource || firstSession?.utmSource || "direct";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link href={`/dashboard/${orgId}/contacts`} className="hover:text-text">
          Contacts
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text">{name || contact.email || "Contact"}</span>
      </div>

      {/* Contact header */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Info card */}
        <div className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {name || <span className="text-text-muted">Anonymous Contact</span>}
              </h1>
              <div className="mt-2 space-y-1">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Mail className="h-3.5 w-3.5" />
                    {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Phone className="h-3.5 w-3.5" />
                    {contact.phone}
                  </div>
                )}
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                contact.leadQuality === "HIGH" && "bg-green-dim text-green",
                contact.leadQuality === "MEDIUM" && "bg-yellow-dim text-yellow",
                contact.leadQuality === "LOW" && "bg-red-dim text-red",
                contact.leadQuality === "UNKNOWN" && "bg-surface-elevated text-text-dim"
              )}
            >
              {contact.leadQuality.toLowerCase()} quality
            </span>
          </div>

          {/* Tags */}
          {contact.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-accent-dim px-2 py-0.5 text-xs text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Identity signals */}
          {contact.identitySignals.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-[11px] font-medium text-text-dim">
                IDENTITY SIGNALS
              </p>
              <div className="space-y-1">
                {contact.identitySignals.map((signal, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-text-dim">
                        {signal.type}
                      </span>
                      <span className="text-text-muted">
                        {signal.rawValue || "hashed"}
                      </span>
                    </div>
                    <span className="text-text-dim">
                      {signal.confidence}% confidence
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 text-[11px] text-text-dim">
            First seen {format(new Date(contact.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
        </div>

        {/* Stats cards */}
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green" />
              <span className="text-xs text-text-muted">Total Revenue</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-green">
              ${contact.totalRevenue.toFixed(2)}
            </p>
            <p className="text-[11px] text-text-dim">
              {contact.totalPayments} payment{contact.totalPayments !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue" />
              <span className="text-xs text-text-muted">Activity</span>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-semibold">{contact._count.events}</p>
                <p className="text-[10px] text-text-dim">events</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{contact._count.sessions}</p>
                <p className="text-[10px] text-text-dim">sessions</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{journey.pageViews.length}</p>
                <p className="text-[10px] text-text-dim">pages</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-accent" />
              <span className="text-xs text-text-muted">First Touch</span>
            </div>
            <p className="mt-1 text-sm font-medium">{firstSource}</p>
            {firstSession?.landingPage && (
              <p className="mt-0.5 truncate text-[11px] text-text-dim">
                {firstSession.landingPage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Journey Timeline */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-text-muted">
          Click Journey
          <span className="ml-2 text-text-dim">
            ({journey.timeline.length} events)
          </span>
        </h2>
        <JourneyTimeline
          items={journey.timeline.map((item) => ({
            ...item,
            timestamp: item.timestamp.toISOString(),
            data: item.data as Record<string, unknown>,
          }))}
        />
      </section>
    </div>
  );
}
