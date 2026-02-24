"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Power, Tag, X } from "lucide-react";

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
  pattern: string;
  excludePattern: string | null;
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
    pattern: "",
    excludePattern: "",
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
          pattern: form.pattern,
          excludePattern: form.excludePattern || undefined,
          eventType: form.eventType,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        setForm({ name: "", pattern: "", excludePattern: "", eventType: "URL_RULE_MATCH", tags: "" });
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
          <h2 className="text-base font-medium">URL Rules</h2>
          <p className="text-xs text-text-muted">
            Fire events when visitors hit specific URL patterns
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Rule
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-4 rounded-lg border border-accent/30 bg-surface p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-dim">
                RULE NAME
              </label>
              <input
                type="text"
                placeholder="e.g. Thank You Page"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-dim">
                EVENT TYPE
              </label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-dim">
                URL PATTERN (glob)
              </label>
              <input
                type="text"
                placeholder="e.g. **/thank-you* or */checkout*"
                value={form.pattern}
                onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-dim">
                EXCLUDE PATTERN (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. **/thank-you-variant*"
                value={form.excludePattern}
                onChange={(e) =>
                  setForm({ ...form, excludePattern: e.target.value })
                }
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-text-dim">
                TAGS (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. purchase, high-ticket"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md px-3 py-1.5 text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              onClick={createRule}
              disabled={!form.name || !form.pattern || saving}
              className="rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Rule"}
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 && !showForm ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-muted">
          No URL rules yet. Add rules to automatically fire events when visitors hit specific pages.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "rounded-lg border bg-surface p-4 transition-colors",
                rule.isActive ? "border-border" : "border-border opacity-50"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{rule.name}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        rule.eventType === "PURCHASE" && "bg-green-dim text-green",
                        rule.eventType === "BOOKING" && "bg-blue-dim text-blue",
                        rule.eventType === "BOOKING_CONFIRMED" && "bg-green-dim text-green",
                        rule.eventType === "OPT_IN" && "bg-green-dim text-green",
                        rule.eventType === "FORM_SUBMIT" && "bg-blue-dim text-blue",
                        !["PURCHASE", "BOOKING", "BOOKING_CONFIRMED", "OPT_IN", "FORM_SUBMIT"].includes(rule.eventType) &&
                          "bg-surface-elevated text-text-dim"
                      )}
                    >
                      {rule.eventType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                    <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-[11px]">
                      {rule.pattern}
                    </code>
                    {rule.excludePattern && (
                      <span className="text-text-dim">
                        excludes:{" "}
                        <code className="font-mono text-[11px]">
                          {rule.excludePattern}
                        </code>
                      </span>
                    )}
                  </div>
                  {rule.tags.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {rule.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] text-accent"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleRule(rule.id, rule.isActive)}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      rule.isActive
                        ? "text-green hover:bg-green-dim"
                        : "text-text-dim hover:bg-surface-elevated"
                    )}
                    title={rule.isActive ? "Disable" : "Enable"}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="rounded-md p-1.5 text-text-dim transition-colors hover:bg-red-dim hover:text-red"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
