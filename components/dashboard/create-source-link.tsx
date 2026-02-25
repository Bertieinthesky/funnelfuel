"use client";

import { useState } from "react";
import { Plus, Copy, Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  orgId: string;
}

export function CreateSourceLink({ orgId }: Props) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [copied, setCopied] = useState(false);

  function generateLink(): string {
    if (!destinationUrl || !source) return "";

    try {
      // Normalize: add https:// if missing
      let url = destinationUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      const parsed = new URL(url);
      parsed.searchParams.set("ffs", source.trim().toLowerCase().replace(/\s+/g, "-"));
      if (title.trim()) {
        parsed.searchParams.set("fft", title.trim().toLowerCase().replace(/\s+/g, "-"));
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
    } catch {
      // Fallback for non-secure contexts
    }
  }

  function handleReset() {
    setSource("");
    setTitle("");
    setDestinationUrl("");
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
        </div>

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
