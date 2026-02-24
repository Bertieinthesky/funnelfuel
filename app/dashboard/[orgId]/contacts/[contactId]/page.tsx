import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getContactDetail, getContactJourney } from "@/lib/dashboard/queries";
import { JourneyTimeline } from "@/components/dashboard/journey-timeline";
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/dashboard/${orgId}/contacts`} className="hover:text-foreground transition-colors">
          Contacts
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{name || contact.email || "Contact"}</span>
      </div>

      {/* Contact header */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Info card */}
        <Card className="gap-0 border-border py-0 lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {name || <span className="text-muted-foreground">Anonymous Contact</span>}
                </h1>
                <div className="mt-2 space-y-1">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {contact.email}
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {contact.phone}
                    </div>
                  )}
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  contact.leadQuality === "HIGH" && "bg-green-dim text-green",
                  contact.leadQuality === "MEDIUM" && "bg-yellow-dim text-yellow",
                  contact.leadQuality === "LOW" && "bg-red-dim text-red",
                  contact.leadQuality === "UNKNOWN" && "bg-secondary text-muted-foreground/60"
                )}
              >
                {contact.leadQuality.toLowerCase()} quality
              </Badge>
            </div>

            {/* Tags */}
            {contact.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {contact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Identity signals */}
            {contact.identitySignals.length > 0 && (
              <div className="mt-4 pt-3">
                <Separator className="mb-3" />
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Identity Signals
                </p>
                <div className="space-y-1">
                  {contact.identitySignals.map((signal, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {signal.type}
                        </Badge>
                        <span className="text-muted-foreground">
                          {signal.rawValue || "hashed"}
                        </span>
                      </div>
                      <span className="text-muted-foreground/60">
                        {signal.confidence}% confidence
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 text-[11px] text-muted-foreground/60">
              First seen {format(new Date(contact.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="space-y-3">
          <Card className="gap-0 border-border py-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green" />
                <span className="text-xs text-muted-foreground">Total Revenue</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-green">
                ${contact.totalRevenue.toFixed(2)}
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                {contact.totalPayments} payment{contact.totalPayments !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 border-border py-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue" />
                <span className="text-xs text-muted-foreground">Activity</span>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-foreground">{contact._count.events}</p>
                  <p className="text-[10px] text-muted-foreground/60">events</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{contact._count.sessions}</p>
                  <p className="text-[10px] text-muted-foreground/60">sessions</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{journey.pageViews.length}</p>
                  <p className="text-[10px] text-muted-foreground/60">pages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 border-border py-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">First Touch</span>
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">{firstSource}</p>
              {firstSession?.landingPage && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground/60">
                  {firstSession.landingPage}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Journey Timeline */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Click Journey
          <span className="ml-2 text-muted-foreground/60">
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
