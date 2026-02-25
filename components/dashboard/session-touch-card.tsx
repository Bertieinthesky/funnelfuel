"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Globe, ChevronDown, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface SessionData {
  ffSource: string | null;
  ffTitle: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  landingPage: string | null;
  adClicks: Record<string, string> | null;
  firstSeen: string;
  visitCount: number;
}

interface Props {
  label: "First Touch" | "Last Touch";
  session: SessionData;
  iconColor?: string;
}

export function SessionTouchCard({
  label,
  session,
  iconColor = "text-primary",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const source = session.ffSource || session.utmSource || "direct";

  // Gather non-empty detail rows
  const details: { label: string; value: string }[] = [];

  if (session.ffTitle) details.push({ label: "Title", value: session.ffTitle });
  if (session.utmMedium)
    details.push({ label: "Medium", value: session.utmMedium });
  if (session.utmCampaign)
    details.push({ label: "Campaign", value: session.utmCampaign });
  if (session.utmContent)
    details.push({ label: "Content", value: session.utmContent });
  if (session.utmTerm) details.push({ label: "Term", value: session.utmTerm });
  if (session.referrer)
    details.push({ label: "Referrer", value: session.referrer });

  // Ad click IDs (fbclid, gclid, etc.)
  const adClicks =
    session.adClicks && typeof session.adClicks === "object"
      ? Object.entries(session.adClicks)
      : [];

  const hasDetails = details.length > 0 || adClicks.length > 0 || session.landingPage;

  return (
    <Card
      className={cn(
        "gap-0 border-border py-0 transition-colors",
        hasDetails && "cursor-pointer hover:border-muted-foreground/30"
      )}
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className={cn("h-4 w-4", iconColor)} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
          {hasDetails && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground/40 transition-transform",
                expanded && "rotate-180"
              )}
            />
          )}
        </div>

        {/* Summary */}
        <p className="mt-1 text-sm font-medium text-foreground">{source}</p>
        {session.ffTitle && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {session.ffTitle}
          </p>
        )}
        {!expanded && session.landingPage && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/60">
            {session.landingPage}
          </p>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground/40">
          {format(new Date(session.firstSeen), "MMM d, yyyy 'at' h:mm a")}
          {session.visitCount > 1 && (
            <span className="ml-1.5">
              ({session.visitCount} visits)
            </span>
          )}
        </p>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {/* Landing page */}
            {session.landingPage && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                  Landing Page
                </p>
                <p className="mt-0.5 break-all text-xs text-foreground">
                  {session.landingPage}
                </p>
              </div>
            )}

            {/* Attribution details */}
            {details.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {details.map((d) => (
                  <div key={d.label}>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                      {d.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-foreground">
                      {d.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Ad click IDs */}
            {adClicks.length > 0 && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                  Ad Click IDs
                </p>
                <div className="mt-1 space-y-1">
                  {adClicks.map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {key}
                      </span>
                      <span className="truncate font-mono text-[10px] text-muted-foreground/60">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}