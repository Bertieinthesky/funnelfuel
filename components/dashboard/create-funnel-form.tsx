"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  ArrowLeft,
  Loader2,
  GripVertical,
  Link as LinkIcon,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────

interface MetricOption {
  id: string;
  name: string;
  kind: string;
  format: string;
}

interface StepData {
  name: string;
  urlPattern: string;
}

interface Props {
  orgId: string;
  allMetrics: MetricOption[];
}

// ─── Funnel type presets ────────────────────────────────────────────────

const FUNNEL_TYPES = [
  {
    value: "LOW_TICKET",
    label: "Low Ticket",
    desc: "Landing page to purchase flow",
    steps: [
      { name: "Landing Page", urlPattern: "" },
      { name: "Opt-in", urlPattern: "" },
      { name: "Checkout", urlPattern: "**/checkout*" },
      { name: "Purchase", urlPattern: "**/thank-you*" },
    ],
  },
  {
    value: "WEBINAR",
    label: "Webinar",
    desc: "Registration through booking",
    steps: [
      { name: "Registration Page", urlPattern: "" },
      { name: "Registered", urlPattern: "**/registered*" },
      { name: "Attended", urlPattern: "" },
      { name: "CTA Click", urlPattern: "" },
      { name: "Application", urlPattern: "**/apply*" },
      { name: "Booking", urlPattern: "**/booked*" },
    ],
  },
  {
    value: "VSL_APPLICATION",
    label: "VSL / Application",
    desc: "Video sales letter to booking",
    steps: [
      { name: "VSL Page", urlPattern: "" },
      { name: "Application", urlPattern: "**/apply*" },
      { name: "Booking", urlPattern: "**/book*" },
      { name: "Booking Confirmed", urlPattern: "**/confirmed*" },
    ],
  },
  {
    value: "WORKSHOP",
    label: "Workshop",
    desc: "Registration to purchase",
    steps: [
      { name: "Landing Page", urlPattern: "" },
      { name: "Registration", urlPattern: "" },
      { name: "Purchase", urlPattern: "**/thank-you*" },
    ],
  },
  {
    value: "CUSTOM",
    label: "Custom",
    desc: "Build your own steps",
    steps: [],
  },
];

// ─── Auto-detect step type from name ────────────────────────────────────

function detectStepType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("landing") || lower === "page") return "LANDING_PAGE";
  if (lower.includes("opt") || lower.includes("sign up")) return "OPT_IN";
  if (lower.includes("checkout")) return "CHECKOUT_VIEW";
  if (lower.includes("purchase") || lower.includes("thank")) return "PURCHASE";
  if (lower.includes("confirmed")) return "BOOKING_CONFIRMED";
  if (lower.includes("book")) return "BOOKING";
  if (lower.includes("application") || lower.includes("apply"))
    return "APPLICATION_SUBMIT";
  if (lower.includes("register")) return "WEBINAR_REGISTER";
  if (lower.includes("attend")) return "WEBINAR_ATTEND";
  if (lower.includes("cta")) return "WEBINAR_CTA_CLICK";
  return "CUSTOM";
}

// ─── Component ──────────────────────────────────────────────────────────

export function CreateFunnelForm({ orgId, allMetrics }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [selectedMetricIds, setSelectedMetricIds] = useState<string[]>([]);

  function selectType(typeValue: string) {
    const preset = FUNNEL_TYPES.find((t) => t.value === typeValue);
    setType(typeValue);
    if (preset) {
      setSteps(preset.steps.map((s) => ({ ...s })));
    }
  }

  function addStep() {
    setSteps([...steps, { name: "", urlPattern: "" }]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof StepData, value: string) {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  }

  function moveStep(index: number, direction: -1 | 1) {
    const updated = [...steps];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= updated.length) return;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSteps(updated);
  }

  function toggleMetric(metricId: string) {
    setSelectedMetricIds((prev) =>
      prev.includes(metricId)
        ? prev.filter((id) => id !== metricId)
        : [...prev, metricId]
    );
  }

  async function handleCreate() {
    if (!name || !type || steps.length === 0) return;
    setError(null);
    setSaving(true);

    try {
      // Create the funnel
      const res = await fetch(`/api/dashboard/${orgId}/funnels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          steps: steps.map((s, i) => ({
            name: s.name,
            type: detectStepType(s.name),
            urlPattern: s.urlPattern || undefined,
            order: i,
          })),
        }),
      });

      if (!res.ok) {
        setError("Failed to create funnel");
        return;
      }

      const funnel = await res.json();

      // If metrics were selected, associate them
      if (selectedMetricIds.length > 0) {
        await fetch(
          `/api/dashboard/${orgId}/funnels/${funnel.id}/kpis`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              selectedMetricIds.map((metricId, i) => ({ metricId, order: i }))
            ),
          }
        );
      }

      router.push(`/dashboard/${orgId}/funnels/${funnel.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const canCreate = name.trim() && type && steps.length > 0 && steps.every((s) => s.name.trim());

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create a Funnel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define the steps in your conversion flow to track performance.
        </p>
      </div>

      {/* ── Section 1: Name ────────────────────────────────────────── */}
      <section>
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Funnel Name
        </label>
        <Input
          type="text"
          placeholder="e.g. Main VSL Funnel"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-md"
        />
      </section>

      {/* ── Section 2: Funnel Type ─────────────────────────────────── */}
      <section>
        <label className="mb-3 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Funnel Type
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FUNNEL_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => selectType(t.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                type === t.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30 hover:bg-secondary/50"
              )}
            >
              <p
                className={cn(
                  "text-sm font-medium",
                  type === t.value ? "text-primary" : "text-foreground"
                )}
              >
                {t.label}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                {t.desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Section 3: Steps ───────────────────────────────────────── */}
      {type && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Funnel Steps ({steps.length})
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={addStep}
              className="text-primary"
            >
              <Plus className="h-3 w-3" />
              Add Step
            </Button>
          </div>

          {steps.length === 0 ? (
            <Card className="border-dashed border-border py-0">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No steps yet.</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Add steps to define each stage of your funnel.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                  className="mt-3"
                >
                  <Plus className="h-3 w-3" />
                  Add First Step
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="group rounded-lg border border-border bg-card p-3 transition-colors hover:border-muted-foreground/20"
                >
                  <div className="flex items-center gap-3">
                    {/* Reorder + number */}
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col gap-0">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => moveStep(i, -1)}
                          disabled={i === 0}
                          className="h-4 w-4"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => moveStep(i, 1)}
                          disabled={i === steps.length - 1}
                          className="h-4 w-4"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                        {i + 1}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Step name (e.g. Landing Page, Checkout, Purchase)"
                        value={step.name}
                        onChange={(e) => updateStep(i, "name", e.target.value)}
                        className="border-none bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
                      />
                    </div>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeStep(i)}
                      className="text-muted-foreground/40 opacity-0 transition-opacity hover:text-red group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* URL pattern */}
                  <div className="mt-2 flex items-center gap-2 pl-[52px]">
                    <LinkIcon className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                    <Input
                      type="text"
                      placeholder="URL pattern (e.g. **/checkout* or **/thank-you*)"
                      value={step.urlPattern}
                      onChange={(e) =>
                        updateStep(i, "urlPattern", e.target.value)
                      }
                      className="h-7 border-none bg-transparent px-0 font-mono text-xs text-muted-foreground shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              ))}

              {/* Add step button at bottom */}
              <button
                onClick={addStep}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-xs text-muted-foreground/60 transition-colors hover:border-primary/30 hover:text-primary"
              >
                <Plus className="h-3 w-3" />
                Add another step
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Section 4: Metrics ─────────────────────────────────────── */}
      {type && allMetrics.length > 0 && (
        <section>
          <div className="mb-3">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              KPI Metrics
            </label>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Select metrics to display on the funnel dashboard. You can change
              these later.
            </p>
          </div>

          {/* Selected metrics */}
          {selectedMetricIds.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedMetricIds.map((id) => {
                const m = allMetrics.find((m) => m.id === id);
                if (!m) return null;
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="gap-1 bg-primary/10 text-primary"
                  >
                    {m.name}
                    <button
                      onClick={() => toggleMetric(id)}
                      className="ml-0.5 hover:text-red"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Available metrics grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {allMetrics
              .filter((m) => !selectedMetricIds.includes(m.id))
              .map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleMetric(m.id)}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <BarChart3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-muted-foreground">
                      {m.name}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[9px] bg-secondary text-muted-foreground/60"
                  >
                    {m.kind}
                  </Badge>
                </button>
              ))}
          </div>
        </section>
      )}

      {/* ── Actions ─────────────────────────────────────────────────── */}
      {type && (
        <div className="flex items-center justify-between border-t border-border pt-6">
          <Link href={`/dashboard/${orgId}/funnels`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Funnels
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            {error && (
              <span className="text-sm text-red">{error}</span>
            )}
            <Button
              onClick={handleCreate}
              disabled={!canCreate || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Funnel"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
