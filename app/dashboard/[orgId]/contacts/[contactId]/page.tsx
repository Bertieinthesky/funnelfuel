import { notFound } from "next/navigation";
import { getContactDetail, getContactJourney } from "@/lib/dashboard/queries";
import { JourneyTimeline } from "@/components/dashboard/journey-timeline";
import { EditContactDialog } from "@/components/dashboard/edit-contact-dialog";
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
  DollarSign,
  Activity,
  Globe,
  Fingerprint,
  Cookie,
} from "lucide-react";
import { SessionTouchCard } from "@/components/dashboard/session-touch-card";

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

  // First touch = oldest session, Last touch = newest session
  const firstSession = journey.sessions[journey.sessions.length - 1];
  const lastSession = journey.sessions[0];

  // Group identity signals by type as "aliases"
  const aliasGroups = new Map<string, typeof contact.identitySignals>();
  for (const signal of contact.identitySignals) {
    if (!aliasGroups.has(signal.type)) {
      aliasGroups.set(signal.type, []);
    }
    aliasGroups.get(signal.type)!.push(signal);
  }

  const ALIAS_ICONS: Record<string, typeof Mail> = {
    EMAIL: Mail,
    PHONE: Phone,
    FINGERPRINT: Fingerprint,
    COOKIE: Cookie,
  };

  const ALIAS_COLORS: Record<string, string> = {
    EMAIL: "text-blue",
    PHONE: "text-green",
    FINGERPRINT: "text-yellow",
    COOKIE: "text-muted-foreground",
  };

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
              <div className="flex items-center gap-2">
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
                <EditContactDialog
                  orgId={orgId}
                  contactId={contactId}
                  initialData={{
                    firstName: contact.firstName ?? "",
                    lastName: contact.lastName ?? "",
                    email: contact.email ?? "",
                    phone: contact.phone ?? "",
                    leadQuality: contact.leadQuality,
                    tags: contact.tags,
                  }}
                />
              </div>
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

            {/* Aliases */}
            {aliasGroups.size > 0 && (
              <div className="mt-4 pt-3">
                <Separator className="mb-3" />
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Aliases
                </p>
                <div className="space-y-2">
                  {Array.from(aliasGroups.entries()).map(([type, signals]) => {
                    const Icon = ALIAS_ICONS[type] ?? Globe;
                    const color = ALIAS_COLORS[type] ?? "text-muted-foreground";
                    return (
                      <div key={type} className="rounded-lg bg-background p-2.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className={cn("h-3.5 w-3.5", color)} />
                          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                            {type}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {signals.map((signal, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-xs text-foreground">
                                {signal.rawValue || "hashed"}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      signal.confidence >= 80 ? "bg-green" :
                                      signal.confidence >= 50 ? "bg-yellow" :
                                      "bg-red"
                                    )}
                                    style={{ width: `${signal.confidence}%` }}
                                  />
                                </div>
                                <span className="text-[10px] tabular-nums text-muted-foreground/60 w-8 text-right">
                                  {signal.confidence}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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

          {firstSession && (
            <SessionTouchCard
              label="First Touch"
              iconColor="text-primary"
              session={{
                ffSource: firstSession.ffSource,
                ffTitle: firstSession.ffTitle,
                utmSource: firstSession.utmSource,
                utmMedium: firstSession.utmMedium,
                utmCampaign: firstSession.utmCampaign,
                utmContent: firstSession.utmContent ?? null,
                utmTerm: firstSession.utmTerm ?? null,
                referrer: firstSession.referrer,
                landingPage: firstSession.landingPage,
                adClicks: firstSession.adClicks as Record<string, string> | null,
                firstSeen: firstSession.firstSeen.toISOString(),
                visitCount: firstSession.visitCount,
              }}
            />
          )}

          {lastSession && lastSession.id !== firstSession?.id && (
            <SessionTouchCard
              label="Last Touch"
              iconColor="text-blue"
              session={{
                ffSource: lastSession.ffSource,
                ffTitle: lastSession.ffTitle,
                utmSource: lastSession.utmSource,
                utmMedium: lastSession.utmMedium,
                utmCampaign: lastSession.utmCampaign,
                utmContent: lastSession.utmContent ?? null,
                utmTerm: lastSession.utmTerm ?? null,
                referrer: lastSession.referrer,
                landingPage: lastSession.landingPage,
                adClicks: lastSession.adClicks as Record<string, string> | null,
                firstSeen: lastSession.firstSeen.toISOString(),
                visitCount: lastSession.visitCount,
              }}
            />
          )}
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
