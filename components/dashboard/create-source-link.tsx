"use client";

import { useState } from "react";
import { Plus, Copy, Check } from "lucide-react";
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

interface Props {
  orgId: string;
}

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
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [emailProvider, setEmailProvider] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedProvider = EMAIL_PROVIDERS.find((p) => p.label === emailProvider);

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Tracking Link</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Generate a URL with FunnelFuel source tracking. When someone clicks
          this link, their visit will be attributed to this source.
        </p>

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

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Source Name
            </label>
            <Input
              type="text"
              placeholder="e.g. instagram, email, youtube, podcast"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <p className="mt-1 text-[10px] text-muted-foreground/50">
              Identifies the traffic channel. Shows up in your Sources dashboard.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Title (optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. bio-link, welcome-email, episode-42"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="mt-1 text-[10px] text-muted-foreground/50">
              Identifies the specific post, email, or video within the source.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Email Provider (optional)
            </label>
            <Select value={emailProvider} onValueChange={setEmailProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select email provider..." />
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
        </div>

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
              <div className="flex-1 overflow-hidden rounded-md border border-border bg-secondary px-3 py-2">
                <p className="truncate font-mono text-xs text-foreground">
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
                    <Check className="h-3.5 w-3.5 text-green" />
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
