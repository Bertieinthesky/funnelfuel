"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Power, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const EVENT_TYPES = [
  "PAGE_VIEW",
  "FORM_SUBMIT",
  "OPT_IN",
  "CHECKOUT_VIEW",
  "PURCHASE",
  "BOOKING",
  "BOOKING_CONFIRMED",
  "APPLICATION_SUBMIT",
  "WEBINAR_REGISTER",
  "WEBINAR_ATTEND",
  "WEBINAR_CTA_CLICK",
  "URL_RULE_MATCH",
  "CUSTOM",
] as const;

interface UrlRule {
  id: string;
  name: string;
  matchType: string;
  pattern: string;
  excludePattern: string | null;
  ignoreCase: boolean;
  ignoreQuery: boolean;
  eventType: string;
  tags: string[];
  funnelStepId: string | null;
  isActive: boolean;
  createdAt: Date | string;
}

interface Props {
  orgId: string;
  initialRules: UrlRule[];
}

export function UrlRulesManager({ orgId, initialRules }: Props) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    matchType: "contains" as string,
    pattern: "",
    excludePattern: "",
    ignoreCase: true,
    ignoreQuery: true,
    eventType: "URL_RULE_MATCH" as string,
    tags: "" as string,
  });

  async function createRule() {
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/${orgId}/url-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          matchType: form.matchType,
          pattern: form.pattern,
          excludePattern: form.matchType === "contains" ? (form.excludePattern || undefined) : undefined,
          ignoreCase: form.ignoreCase,
          ignoreQuery: form.ignoreQuery,
          eventType: form.eventType,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        setForm({ name: "", matchType: "contains", pattern: "", excludePattern: "", ignoreCase: true, ignoreQuery: true, eventType: "URL_RULE_MATCH", tags: "" });
        setShowForm(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(ruleId: string, isActive: boolean) {
    await fetch(`/api/dashboard/${orgId}/url-rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  async function deleteRule(ruleId: string) {
    await fetch(`/api/dashboard/${orgId}/url-rules/${ruleId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-foreground">URL Rules</h2>
          <p className="text-xs text-muted-foreground">
            Fire events when visitors hit specific URL patterns
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" />
          Add Rule
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="mb-4 gap-0 border-primary/30 py-0 animate-fade-in">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Rule name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Thank You Page"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Event type
                </label>
                <Select value={form.eventType} onValueChange={(v) => setForm({ ...form, eventType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Match type
                </label>
                <Select value={form.matchType} onValueChange={(v) => setForm({ ...form, matchType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contains (glob pattern)</SelectItem>
                    <SelectItem value="exact">Exact Match (full URL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {form.matchType === "exact" ? "URL (exact match)" : "URL pattern (glob)"}
                </label>
                <Input
                  type="text"
                  placeholder={form.matchType === "exact"
                    ? "e.g. https://www.yourdomain.com/thank-you"
                    : "e.g. **/thank-you* or */checkout*"
                  }
                  value={form.pattern}
                  onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                  className="font-mono"
                />
              </div>
              {form.matchType === "contains" && (
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Exclude pattern (optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. **/thank-you-variant*"
                    value={form.excludePattern}
                    onChange={(e) => setForm({ ...form, excludePattern: e.target.value })}
                    className="font-mono"
                  />
                </div>
              )}
              <div className="md:col-span-2 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="ignoreCase"
                    checked={form.ignoreCase}
                    onCheckedChange={(v) => setForm({ ...form, ignoreCase: v })}
                  />
                  <Label htmlFor="ignoreCase" className="text-xs text-muted-foreground cursor-pointer">
                    Ignore case
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="ignoreQuery"
                    checked={form.ignoreQuery}
                    onCheckedChange={(v) => setForm({ ...form, ignoreQuery: v })}
                  />
                  <Label htmlFor="ignoreQuery" className="text-xs text-muted-foreground cursor-pointer">
                    Ignore query string (?utm_source=...)
                  </Label>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Tags (comma-separated)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. purchase, high-ticket"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={createRule}
                disabled={!form.name || !form.pattern || saving}
              >
                {saving ? "Saving..." : "Create Rule"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      {rules.length === 0 && !showForm ? (
        <Card className="border-border py-0">
          <div className="p-8 text-center text-sm text-muted-foreground">
            No URL rules yet. Add rules to automatically fire events when visitors hit specific pages.
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              className={cn(
                "gap-0 py-0 transition-all duration-200",
                rule.isActive ? "border-border" : "border-border opacity-50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">{rule.name}</h3>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          rule.eventType === "PURCHASE" && "bg-green-dim text-green",
                          rule.eventType === "BOOKING" && "bg-blue-dim text-blue",
                          rule.eventType === "BOOKING_CONFIRMED" && "bg-green-dim text-green",
                          rule.eventType === "OPT_IN" && "bg-green-dim text-green",
                          rule.eventType === "FORM_SUBMIT" && "bg-blue-dim text-blue"
                        )}
                      >
                        {rule.eventType.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          rule.matchType === "exact" ? "bg-yellow-dim text-yellow" : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {rule.matchType === "exact" ? "exact" : "contains"}
                      </Badge>
                      <code className="rounded-md bg-background px-1.5 py-0.5 font-mono text-[11px]">
                        {rule.pattern}
                      </code>
                      {rule.excludePattern && rule.matchType !== "exact" && (
                        <span className="text-muted-foreground/60">
                          excludes:{" "}
                          <code className="font-mono text-[11px]">
                            {rule.excludePattern}
                          </code>
                        </span>
                      )}
                      {!rule.ignoreCase && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary text-muted-foreground">
                          case-sensitive
                        </Badge>
                      )}
                      {!rule.ignoreQuery && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary text-muted-foreground">
                          includes query
                        </Badge>
                      )}
                    </div>
                    {rule.tags.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {rule.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary text-[10px] gap-0.5">
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => toggleRule(rule.id, rule.isActive)}
                      className={rule.isActive ? "text-green hover:text-green" : "text-muted-foreground"}
                      title={rule.isActive ? "Disable" : "Enable"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteRule(rule.id)}
                      className="text-muted-foreground hover:text-red"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
