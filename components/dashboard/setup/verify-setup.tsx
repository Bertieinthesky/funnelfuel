"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  orgId: string;
}

interface PixelStatus {
  pageViews: number;
  events: number;
  active: boolean;
}

interface WebhookStatus {
  lastReceived: string | null;
  count: number;
}

const SOURCE_LABELS: Record<string, string> = {
  STRIPE_WEBHOOK: "Stripe",
  CLICKFUNNELS_WEBHOOK: "ClickFunnels",
  GHL_WEBHOOK: "GoHighLevel",
  CALENDLY_WEBHOOK: "Calendly",
  TYPEFORM_WEBHOOK: "Typeform",
  JOTFORM_WEBHOOK: "JotForm",
  ZAPIER_WEBHOOK: "Zapier",
  SCHEDULEONCE_WEBHOOK: "ScheduleOnce",
  WHOP_WEBHOOK: "Whop",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function VerifySetup({ orgId }: Props) {
  const [pixelStatus, setPixelStatus] = useState<PixelStatus | null>(null);
  const [pixelLoading, setPixelLoading] = useState(false);
  const [pixelChecked, setPixelChecked] = useState(false);

  const [webhookStatus, setWebhookStatus] = useState<Record<string, WebhookStatus> | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookChecked, setWebhookChecked] = useState(false);

  async function checkPixel() {
    setPixelLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${orgId}/setup/verify?type=pixel`);
      const data = await res.json();
      setPixelStatus(data.pixel);
      setPixelChecked(true);
    } catch {
      setPixelStatus(null);
    } finally {
      setPixelLoading(false);
    }
  }

  async function checkWebhooks() {
    setWebhookLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${orgId}/setup/verify?type=webhooks`);
      const data = await res.json();
      setWebhookStatus(data.webhooks);
      setWebhookChecked(true);
    } catch {
      setWebhookStatus(null);
    } finally {
      setWebhookLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Pixel verification */}
      <div>
        <h3 className="text-sm font-medium text-foreground">Pixel Verification</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Open your website in a new tab to generate a page view, then click the button below to verify data is being received.
        </p>

        <div className="mt-4">
          <Button onClick={checkPixel} disabled={pixelLoading} size="sm">
            {pixelLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking...
              </>
            ) : pixelChecked ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Re-check Pixel
              </>
            ) : (
              "Test Pixel"
            )}
          </Button>
        </div>

        {pixelChecked && pixelStatus && (
          <div className="mt-4 rounded-lg border border-border p-4">
            {pixelStatus.active ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-500">Pixel is working!</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Received {pixelStatus.pageViews} page view{pixelStatus.pageViews !== 1 ? "s" : ""} and {pixelStatus.events} event{pixelStatus.events !== 1 ? "s" : ""} in the last 5 minutes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium text-foreground">No data received yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    No page views detected in the last 5 minutes. Make sure the pixel is installed on your site and try visiting a page, then re-check.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Webhook verification */}
      <div>
        <h3 className="text-sm font-medium text-foreground">Webhook Status</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Check whether FunnelFuel has received any webhook events from your connected integrations.
        </p>

        <div className="mt-4">
          <Button onClick={checkWebhooks} disabled={webhookLoading} size="sm">
            {webhookLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking...
              </>
            ) : webhookChecked ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Re-check Webhooks
              </>
            ) : (
              "Check Webhooks"
            )}
          </Button>
        </div>

        {webhookChecked && webhookStatus && (
          <div className="mt-4 rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Integration</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total Events</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Last Received</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(SOURCE_LABELS).map(([source, label]) => {
                  const status = webhookStatus[source];
                  const hasData = status && status.count > 0;
                  return (
                    <tr key={source} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2.5 font-medium text-foreground">{label}</td>
                      <td className="px-4 py-2.5">
                        {hasData ? (
                          <span className="inline-flex items-center gap-1.5 text-green-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">No data</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {status?.count ?? 0}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {status?.lastReceived ? timeAgo(status.lastReceived) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
