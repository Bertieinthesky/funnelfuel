"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  orgId: string;
}

interface Integration {
  name: string;
  slug: string;
  tracks: string;
  url: string;
  note?: string;
  steps: string[];
}

function getIntegrations(orgId: string): Integration[] {
  return [
    {
      name: "Stripe",
      slug: "stripe",
      tracks: "Purchases",
      url: "https://app.funnelfuel.ai/api/webhooks/stripe",
      note: "Stripe uses signature verification. No ?orgId needed — set client_reference_id on Checkout Sessions instead.",
      steps: [
        "Go to Stripe Dashboard → Developers → Webhooks",
        `Add endpoint URL: https://app.funnelfuel.ai/api/webhooks/stripe`,
        "Select events: checkout.session.completed, payment_intent.succeeded",
        "Copy the signing secret and set it as STRIPE_WEBHOOK_SECRET in your environment",
        `When creating Checkout Sessions, set client_reference_id to: ${orgId}`,
        `For PaymentIntents, add metadata.organizationId: ${orgId}`,
      ],
    },
    {
      name: "ClickFunnels",
      slug: "clickfunnels",
      tracks: "Form submissions",
      url: `https://app.funnelfuel.ai/api/webhooks/clickfunnels?orgId=${orgId}`,
      note: "Supports both ClickFunnels Classic and 2.0 formats.",
      steps: [
        "In ClickFunnels, go to your funnel settings",
        'Navigate to "Webhooks" or "Integrations"',
        "Add a new webhook with the URL above",
        "Set it to trigger on form submissions",
        "Save — form submissions will now appear as opt-in events",
      ],
    },
    {
      name: "GoHighLevel",
      slug: "ghl",
      tracks: "Opt-ins, bookings",
      url: `https://app.funnelfuel.ai/api/webhooks/ghl?orgId=${orgId}`,
      steps: [
        "In GHL, go to Settings → Webhooks (or Automation → Webhooks)",
        "Create a new webhook with the URL above",
        "Subscribe to events: Contact Create, Form Submission, Appointment Create",
        "Save — GHL events will now flow into FunnelFuel",
      ],
    },
    {
      name: "Calendly",
      slug: "calendly",
      tracks: "Bookings",
      url: `https://app.funnelfuel.ai/api/webhooks/calendly?orgId=${orgId}`,
      steps: [
        "Go to Calendly → Integrations → Webhooks (or use the Calendly API)",
        "Create a webhook subscription with the URL above",
        "Subscribe to: invitee.created",
        "Bookings will appear as booking events in FunnelFuel",
      ],
    },
    {
      name: "Typeform",
      slug: "typeform",
      tracks: "Form submissions",
      url: `https://app.funnelfuel.ai/api/webhooks/typeform?orgId=${orgId}`,
      steps: [
        "Open your form in Typeform",
        "Go to Connect → Webhooks",
        "Add the webhook URL above",
        "Form completions will appear as opt-in events",
      ],
    },
    {
      name: "JotForm",
      slug: "jotform",
      tracks: "Form submissions",
      url: `https://app.funnelfuel.ai/api/webhooks/jotform?orgId=${orgId}`,
      steps: [
        "Open your form in JotForm",
        "Go to Settings → Integrations → Webhooks",
        "Add the webhook URL above",
        "Form submissions will appear as opt-in events",
      ],
    },
    {
      name: "Zapier",
      slug: "zapier",
      tracks: "Custom events",
      url: `https://app.funnelfuel.ai/api/webhooks/zapier?orgId=${orgId}`,
      note: "Generic webhook bridge — connect any Zapier trigger to FunnelFuel.",
      steps: [
        "In Zapier, create a new Zap",
        "Choose your trigger app and event",
        'For the action, select "Webhooks by Zapier" → POST',
        "Set the URL to the webhook URL above",
        "Map fields: email, phone, firstName, lastName, eventType",
        "Turn on the Zap — events will flow into FunnelFuel",
      ],
    },
    {
      name: "ScheduleOnce",
      slug: "scheduleonce",
      tracks: "Bookings",
      url: `https://app.funnelfuel.ai/api/webhooks/scheduleonce?orgId=${orgId}`,
      steps: [
        "In ScheduleOnce, go to Integrations → Webhooks",
        "Add a new webhook with the URL above",
        "Select booking confirmation events",
        "Bookings will appear as booking events in FunnelFuel",
      ],
    },
    {
      name: "Whop",
      slug: "whop",
      tracks: "Purchases",
      url: `https://app.funnelfuel.ai/api/webhooks/whop?orgId=${orgId}`,
      steps: [
        "In your Whop dashboard, go to Developer Settings → Webhooks",
        "Add a new webhook with the URL above",
        "Subscribe to payment events",
        "Purchases will appear as purchase events in FunnelFuel",
      ],
    },
  ];
}

export function WebhookSetup({ orgId }: Props) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const integrations = getIntegrations(orgId);

  async function copyUrl(url: string, slug: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(slug);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground">Webhook Integrations</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Connect your platforms to receive events like purchases, bookings, and form submissions directly in FunnelFuel.
          Copy the webhook URL for each integration and paste it into the platform&apos;s webhook settings.
        </p>
      </div>

      <div className="space-y-2">
        {integrations.map((integration) => {
          const isExpanded = expanded === integration.slug;
          const isCopied = copiedUrl === integration.slug;

          return (
            <div key={integration.slug} className="rounded-lg border border-border overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : integration.slug)}
                    className="flex items-center gap-2 text-left hover:text-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-foreground">{integration.name}</span>
                  </button>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                    {integration.tracks}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyUrl(integration.url, integration.slug)}
                  className="shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy URL
                    </>
                  )}
                </Button>
              </div>

              {/* Webhook URL */}
              <div className="border-t border-border bg-[#0d0d0d] px-4 py-2">
                <code className="text-[11px] font-mono text-muted-foreground break-all">
                  {integration.url}
                </code>
              </div>

              {/* Expanded instructions */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3">
                  {integration.note && (
                    <p className="mb-3 text-[11px] text-primary/80">{integration.note}</p>
                  )}
                  <ol className="space-y-2">
                    {integration.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="shrink-0 font-mono text-primary/60">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
