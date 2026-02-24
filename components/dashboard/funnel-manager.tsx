"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Power,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
} from "lucide-react";

const FUNNEL_TYPES = [
  { value: "LOW_TICKET", label: "Low Ticket" },
  { value: "WEBINAR", label: "Webinar" },
  { value: "VSL_APPLICATION", label: "VSL / Application" },
  { value: "CUSTOM", label: "Custom" },
];

const STEP_TYPES = [
  { value: "LANDING_PAGE", label: "Landing Page" },
  { value: "OPT_IN", label: "Opt-in" },
  { value: "CHECKOUT_VIEW", label: "Checkout View" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "BOOKING", label: "Booking" },
  { value: "BOOKING_CONFIRMED", label: "Booking Confirmed" },
  { value: "APPLICATION_SUBMIT", label: "Application Submit" },
  { value: "WEBINAR_REGISTER", label: "Webinar Register" },
  { value: "WEBINAR_ATTEND", label: "Webinar Attend" },
  { value: "WEBINAR_CTA_CLICK", label: "Webinar CTA Click" },
  { value: "URL_RULE", label: "URL Rule" },
  { value: "CUSTOM", label: "Custom" },
];

// Preset funnel templates
const TEMPLATES: Record<string, { steps: { name: string; type: string; urlPattern: string }[] }> = {
  LOW_TICKET: {
    steps: [
      { name: "Landing Page", type: "LANDING_PAGE", urlPattern: "" },
      { name: "Opt-in", type: "OPT_IN", urlPattern: "" },
      { name: "Checkout", type: "CHECKOUT_VIEW", urlPattern: "**/checkout*" },
      { name: "Purchase", type: "PURCHASE", urlPattern: "**/thank-you*" },
    ],
  },
  WEBINAR: {
    steps: [
      { name: "Registration Page", type: "LANDING_PAGE", urlPattern: "" },
      { name: "Registered", type: "WEBINAR_REGISTER", urlPattern: "**/registered*" },
      { name: "Attended", type: "WEBINAR_ATTEND", urlPattern: "" },
      { name: "CTA Click", type: "WEBINAR_CTA_CLICK", urlPattern: "" },
      { name: "Application", type: "APPLICATION_SUBMIT", urlPattern: "**/apply*" },
      { name: "Booking", type: "BOOKING_CONFIRMED", urlPattern: "**/booked*" },
    ],
  },
  VSL_APPLICATION: {
    steps: [
      { name: "VSL Page", type: "LANDING_PAGE", urlPattern: "" },
      { name: "Application", type: "APPLICATION_SUBMIT", urlPattern: "**/apply*" },
      { name: "Booking", type: "BOOKING", urlPattern: "**/book*" },
      { name: "Booking Confirmed", type: "BOOKING_CONFIRMED", urlPattern: "**/confirmed*" },
    ],
  },
  CUSTOM: { steps: [] },
};

interface FunnelStep {
  id?: string;
  name: string;
  type: string;
  urlPattern: string | null;
  order: number;
  createdAt?: string;
}

interface FunnelData {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps: FunnelStep[];
  _count: { events: number; experiments: number };
}

interface Props {
  orgId: string;
  initialFunnels: FunnelData[];
}

export function FunnelManager({ orgId, initialFunnels }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedFunnel, setExpandedFunnel] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "CUSTOM" as string,
    steps: [] as { name: string; type: string; urlPattern: string }[],
  });

  function selectType(type: string) {
    const template = TEMPLATES[type];
    setForm({
      ...form,
      type,
      steps: template ? [...template.steps] : [],
    });
  }

  function addStep() {
    setForm({
      ...form,
      steps: [
        ...form.steps,
        { name: "", type: "CUSTOM", urlPattern: "" },
      ],
    });
  }

  function removeStep(index: number) {
    setForm({
      ...form,
      steps: form.steps.filter((_, i) => i !== index),
    });
  }

  function updateStep(index: number, field: string, value: string) {
    const steps = [...form.steps];
    steps[index] = { ...steps[index], [field]: value };
    setForm({ ...form, steps });
  }

  function moveStep(index: number, direction: -1 | 1) {
    const steps = [...form.steps];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
    setForm({ ...form, steps });
  }

  async function createFunnel() {
    if (!form.name || form.steps.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/${orgId}/funnels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          steps: form.steps.map((s, i) => ({
            name: s.name,
            type: s.type,
            urlPattern: s.urlPattern || undefined,
            order: i,
          })),
        }),
      });
      if (res.ok) {
        setForm({ name: "", type: "CUSTOM", steps: [] });
        setShowForm(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleFunnel(funnelId: string, isActive: boolean) {
    await fetch(`/api/dashboard/${orgId}/funnels/${funnelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  async function deleteFunnel(funnelId: string) {
    await fetch(`/api/dashboard/${orgId}/funnels/${funnelId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Funnels</h2>
          <p className="text-xs text-text-muted">
            Define multi-step conversion flows to track performance
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          New Funnel
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-4 rounded-lg border border-accent/30 bg-surface p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-dim">
                FUNNEL NAME
              </label>
              <input
                type="text"
                placeholder="e.g. Main Low Ticket Funnel"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-dim">
                FUNNEL TYPE
              </label>
              <select
                value={form.type}
                onChange={(e) => selectType(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
              >
                {FUNNEL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-text-dim">
                Selecting a type pre-fills common steps. You can customize them below.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-medium text-text-dim">
                FUNNEL STEPS ({form.steps.length})
              </label>
              <button
                onClick={addStep}
                className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover"
              >
                <Plus className="h-3 w-3" />
                Add Step
              </button>
            </div>

            {form.steps.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-text-dim">
                No steps yet. Select a funnel type above or add steps manually.
              </p>
            ) : (
              <div className="space-y-2">
                {form.steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-border bg-bg p-2"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveStep(i, -1)}
                        disabled={i === 0}
                        className="text-text-dim hover:text-text disabled:opacity-20"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveStep(i, 1)}
                        disabled={i === form.steps.length - 1}
                        className="text-text-dim hover:text-text disabled:opacity-20"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[10px] font-medium text-text-dim">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="Step name"
                      value={step.name}
                      onChange={(e) => updateStep(i, "name", e.target.value)}
                      className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
                    />
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(i, "type", e.target.value)}
                      className="rounded border border-border bg-surface px-2 py-1 text-xs text-text focus:border-accent focus:outline-none"
                    >
                      {STEP_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="URL pattern (optional)"
                      value={step.urlPattern}
                      onChange={(e) =>
                        updateStep(i, "urlPattern", e.target.value)
                      }
                      className="w-48 rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
                    />
                    <button
                      onClick={() => removeStep(i)}
                      className="rounded p-1 text-text-dim hover:bg-red-dim hover:text-red"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                setForm({ name: "", type: "CUSTOM", steps: [] });
              }}
              className="rounded-md px-3 py-1.5 text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              onClick={createFunnel}
              disabled={!form.name || form.steps.length === 0 || saving}
              className="rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Funnel"}
            </button>
          </div>
        </div>
      )}

      {/* Existing funnels */}
      {initialFunnels.length === 0 && !showForm ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-muted">
          No funnels configured yet. Create one to start tracking multi-step conversions.
        </div>
      ) : (
        <div className="space-y-2">
          {initialFunnels.map((funnel) => {
            const isExpanded = expandedFunnel === funnel.id;

            return (
              <div
                key={funnel.id}
                className={cn(
                  "rounded-lg border bg-surface transition-colors",
                  funnel.isActive ? "border-border" : "border-border opacity-50"
                )}
              >
                {/* Header */}
                <div
                  className="flex cursor-pointer items-center justify-between p-4"
                  onClick={() =>
                    setExpandedFunnel(isExpanded ? null : funnel.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{funnel.name}</h3>
                        <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] text-text-dim">
                          {funnel.type.replace("_", " ").toLowerCase()}
                        </span>
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            funnel.isActive ? "bg-green" : "bg-text-dim"
                          )}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-text-dim">
                        {funnel.steps.length} steps ·{" "}
                        {funnel._count.events} events ·{" "}
                        {funnel._count.experiments} tests
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFunnel(funnel.id, funnel.isActive);
                      }}
                      className={cn(
                        "rounded-md p-1.5 transition-colors",
                        funnel.isActive
                          ? "text-green hover:bg-green-dim"
                          : "text-text-dim hover:bg-surface-elevated"
                      )}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFunnel(funnel.id);
                      }}
                      className="rounded-md p-1.5 text-text-dim transition-colors hover:bg-red-dim hover:text-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-text-dim" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-text-dim" />
                    )}
                  </div>
                </div>

                {/* Expanded steps */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <div className="space-y-1.5">
                      {funnel.steps.map((step, i) => (
                        <div
                          key={step.id || i}
                          className="flex items-center gap-3 rounded-md bg-bg px-3 py-2"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[10px] font-medium text-text-dim">
                            {i + 1}
                          </span>
                          <span className="text-sm">{step.name}</span>
                          <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-text-dim">
                            {step.type.replace(/_/g, " ")}
                          </span>
                          {step.urlPattern && (
                            <code className="ml-auto font-mono text-[11px] text-text-dim">
                              {step.urlPattern}
                            </code>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
