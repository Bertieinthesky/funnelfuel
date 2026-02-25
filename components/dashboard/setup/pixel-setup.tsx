"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Props {
  orgId: string;
  publicKey: string;
}

const platforms = [
  {
    name: "ClickFunnels",
    steps: [
      "Go to your funnel or website settings",
      'Navigate to "Tracking Code" section',
      'Paste the pixel code into "Head Tracking Code"',
      "Save changes — the pixel will load on every page",
    ],
  },
  {
    name: "GoHighLevel",
    steps: [
      "Open your site or funnel in the builder",
      'Go to Settings → "Custom Code"',
      'Paste the pixel code into the "Head Code" section',
      "Save and publish",
    ],
  },
  {
    name: "WordPress",
    steps: [
      'Install the "Insert Headers and Footers" plugin (or similar)',
      "Go to Settings → Insert Headers and Footers",
      "Paste the pixel code into the Header section",
      'Click "Save" — the pixel will load site-wide',
    ],
  },
  {
    name: "Shopify",
    steps: [
      "Go to Online Store → Themes",
      'Click "Edit code" on your active theme',
      "Open the theme.liquid file",
      "Paste the pixel code just before the closing </head> tag",
      "Save the file",
    ],
  },
  {
    name: "Custom HTML",
    steps: [
      "Open your site's HTML template or layout file",
      "Find the <head> section",
      "Paste the pixel code before the closing </head> tag",
      "Deploy your changes",
    ],
  },
];

export function PixelSetup({ orgId, publicKey }: Props) {
  const [copied, setCopied] = useState(false);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const snippet = `<script src="https://app.funnelfuel.ai/pixel.js" data-org-key="${publicKey}" async></script>`;

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="space-y-8">
      {/* Code snippet */}
      <div>
        <h3 className="text-sm font-medium text-foreground">Your Tracking Pixel</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste this snippet before the closing <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">&lt;/head&gt;</code> tag on every page you want to track.
        </p>

        <div className="mt-3 relative">
          <div className="rounded-lg border border-border bg-[#0d0d0d] p-4 pr-20 overflow-x-auto">
            <code className="block whitespace-pre text-xs font-mono text-orange-400">
              {snippet}
            </code>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copySnippet}
            className="absolute right-2 top-2"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground/60">
          Your org key: <code className="font-mono text-muted-foreground">{publicKey}</code>
        </p>
      </div>

      {/* Platform instructions */}
      <div>
        <h3 className="text-sm font-medium text-foreground">Platform-Specific Instructions</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Select your platform for step-by-step installation instructions.
        </p>

        <div className="mt-3 space-y-1">
          {platforms.map((platform) => {
            const isExpanded = expandedPlatform === platform.name;
            return (
              <div key={platform.name} className="rounded-lg border border-border">
                <button
                  onClick={() => setExpandedPlatform(isExpanded ? null : platform.name)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary/50 transition-colors rounded-lg"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {platform.name}
                </button>
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3">
                    <ol className="space-y-2">
                      {platform.steps.map((step, i) => (
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

      {/* Source tracking */}
      <div>
        <h3 className="text-sm font-medium text-foreground">Source Tracking</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          To attribute traffic to specific sources, append <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">?ffs=source-name</code> to
          any link. Add <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">&fft=title</code> for
          additional detail (e.g., which email or video).
        </p>
        <div className="mt-2 rounded-lg border border-border bg-[#0d0d0d] p-3">
          <code className="text-xs font-mono text-muted-foreground">
            https://yoursite.com/page<span className="text-orange-400">?ffs=youtube&fft=how-to-video</span>
          </code>
        </div>
        <div className="mt-3">
          <Link
            href={`/dashboard/${orgId}/sources`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Generate tracking links in Sources
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Conversion tracking info */}
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <h3 className="text-sm font-medium text-foreground">Conversion Tracking</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The pixel automatically tracks page views and form submissions. To track other conversions like purchases or bookings:
        </p>
        <ul className="mt-2 space-y-1.5">
          <li className="flex gap-2 text-xs text-muted-foreground">
            <span className="text-primary">1.</span>
            <span>
              <strong className="text-foreground/80">URL Rules</strong> — fire events when visitors hit specific pages (e.g., <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">/thank-you</code> → Purchase).{" "}
              <Link href={`/dashboard/${orgId}/metrics`} className="text-primary hover:underline">
                Set up in Metrics
              </Link>
            </span>
          </li>
          <li className="flex gap-2 text-xs text-muted-foreground">
            <span className="text-primary">2.</span>
            <span>
              <strong className="text-foreground/80">Webhooks</strong> — receive events directly from platforms like Stripe, GHL, or Calendly. See the Webhooks tab above.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
