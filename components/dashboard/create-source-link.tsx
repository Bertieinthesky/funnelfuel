"use client";

import { useState } from "react";
import { Plus, Copy, Check, Mail, Megaphone, Share2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";

interface Props {
  orgId: string;
}

/* ── Link type presets ─────────────────────────────────── */

interface LinkType {
  id: string;
  label: string;
  icon: typeof Mail;
  defaultSource: string;
  titlePlaceholder: string;
  showEmailProvider: boolean;
}

const LINK_TYPES: LinkType[] = [
  {
    id: "email",
    label: "Email",
    icon: Mail,
    defaultSource: "email",
    titlePlaceholder: "e.g. welcome-sequence, promo-jan, newsletter-42",
    showEmailProvider: true,
  },
  {
    id: "social",
    label: "Social",
    icon: Share2,
    defaultSource: "",
    titlePlaceholder: "e.g. bio-link, reel-workout, story-promo",
    showEmailProvider: false,
  },
  {
    id: "ads",
    label: "Ads",
    icon: Megaphone,
    defaultSource: "",
    titlePlaceholder: "e.g. cold-audience, retarget-v2, lookalike",
    showEmailProvider: false,
  },
  {
    id: "other",
    label: "Other",
    icon: Link2,
    defaultSource: "",
    titlePlaceholder: "e.g. podcast-ep12, sms-blast, qr-code",
    showEmailProvider: false,
  },
];

const SOCIAL_SOURCES = [
  "instagram",
  "youtube",
  "tiktok",
  "facebook",
  "twitter",
  "linkedin",
  "pinterest",
  "threads",
];

const AD_SOURCES = [
  "facebook-ads",
  "google-ads",
  "youtube-ads",
  "tiktok-ads",
  "linkedin-ads",
  "pinterest-ads",
  "twitter-ads",
  "snapchat-ads",
];

const EMAIL_PROVIDERS: { label: string; tag: string }[] = [
  { label: "ActiveCampaign", tag: "%EMAIL%" },
  { label: "Mailchimp", tag: "*|EMAIL|*" },
  { label: "ConvertKit / Kit", tag: "{{ subscriber.email_address }}" },
  { label: "Klaviyo", tag: "{{ email }}" },
  { label: "GoHighLevel", tag: "{{contact.email}}" },
  { label: "Keap / Infusionsoft", tag: "~Contact.Email~" },
  { label: "HubSpot", tag: "{{contact.email}}" },
  { label: "Drip", tag: "{{ subscriber.email }}" },
  { label: "AWeber", tag: "{!email}" },
  { label: "GetResponse", tag: "[[email]]" },
  { label: "Ontraport", tag: "[Email]" },
  { label: "MailerLite", tag: "{$email}" },
  { label: "Brevo (Sendinblue)", tag: "{{ contact.EMAIL }}" },
  { label: "Kartra", tag: "{email}" },
];

export function CreateSourceLink({ orgId }: Props) {
  const [open, setOpen] = useState(false);
  const [linkType, setLinkType] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [emailProvider, setEmailProvider] = useState("");
  const [copied, setCopied] = useState(false);

  const activeLinkType = LINK_TYPES.find((t) => t.id === linkType);
  const selectedProvider = EMAIL_PROVIDERS.find((p) => p.label === emailProvider);

  function selectLinkType(id: string) {
    const lt = LINK_TYPES.find((t) => t.id === id);
    setLinkType(id);
    if (lt?.defaultSource) {
      setSource(lt.defaultSource);
    } else {
      setSource("");
    }
    setEmailProvider("");
    setCopied(false);
  }

  function generateLink(): string {
    if (!destinationUrl || !source) return "";

    try {
      let url = destinationUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      const parsed = new URL(url);
      parsed.searchParams.set("ffs", source.trim().toLowerCase().replace(/\s+/g, "-"));
      if (title.trim()) {
        parsed.searchParams.set("fft", title.trim().toLowerCase().replace(/\s+/g, "-"));
      }
      if (selectedProvider) {
        parsed.searchParams.set("ffc", selectedProvider.tag);
      }
      return parsed.toString();
    } catch {
      return "";
    }
  }

  async function copyLink() {
    const link = generateLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleReset() {
    setLinkType(null);
    setSource("");
    setTitle("");
    setDestinationUrl("");
    setEmailProvider("");
    setCopied(false);
  }

  const link = generateLink();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) handleReset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" />
          Create Tracking Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create Tracking Link</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Choose where this link will be used, then fill in the details.
        </p>

        {/* Link type toggle */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {LINK_TYPES.map((lt) => (
            <button
              key={lt.id}
              onClick={() => selectLinkType(lt.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] transition-colors",
                linkType === lt.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <lt.icon className={cn("h-4 w-4", linkType === lt.id ? "text-primary" : "text-muted-foreground/60")} />
              {lt.label}
            </button>
          ))}
        </div>

        {/* Form fields — shown after type selection */}
        {linkType && activeLinkType && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Destination URL
              </label>
              <Input
                type="text"
                placeholder="https://yoursite.com/landing-page"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
              />
            </div>

            {/* Source — select for social/ads, text input for email/other */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Source
              </label>
              {linkType === "social" ? (
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : linkType === "ads" ? (
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ad platform..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : linkType === "email" ? (
                <Input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="email"
                />
              ) : (
                <Input
                  type="text"
                  placeholder="e.g. podcast, sms, qr-code"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Title (optional)
              </label>
              <Input
                type="text"
                placeholder={activeLinkType.titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="mt-1 text-[10px] text-muted-foreground/50">
                Identifies the specific post, email, or ad within the source.
              </p>
            </div>

            {/* Email provider — only for email type */}
            {activeLinkType.showEmailProvider && (
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Email Provider
                </label>
                <Select value={emailProvider} onValueChange={setEmailProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider for auto merge tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_PROVIDERS.map((p) => (
                      <SelectItem key={p.label} value={p.label}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[10px] text-muted-foreground/50">
                  Auto-inserts the email merge tag so contacts are identified on click.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Merge tag preview */}
        {selectedProvider && (
          <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/80">{selectedProvider.label}</span> merge tag:{" "}
              <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px] text-primary">
                {selectedProvider.tag}
              </code>
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground/60">
              This will be replaced with the recipient&apos;s email when the email is sent.
            </p>
          </div>
        )}

        {/* Generated link preview */}
        {link && (
          <div className="mt-4">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Your Tracking Link
            </label>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-secondary px-3 py-2">
                <p className="break-all font-mono text-xs text-foreground">
                  {link}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="shrink-0"
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
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              handleReset();
            }}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
