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
  X,
} from "lucide-react";
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
          <h2 className="text-base font-medium text-foreground">Funnels</h2>
          <p className="text-xs text-muted-foreground">
            Define multi-step conversion flows to track performance
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" />
          New Funnel
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="mb-4 gap-0 border-primary/30 py-0 animate-fade-in">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Funnel name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Main Low Ticket Funnel"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Funnel type
                </label>
                <Select value={form.type} onValueChange={selectType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNNEL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[10px] text-muted-foreground/60">
                  Selecting a type pre-fills common steps. You can customize them below.
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Funnel steps ({form.steps.length})
                </label>
                <Button variant="ghost" size="xs" onClick={addStep} className="text-primary">
                  <Plus className="h-3 w-3" />
                  Add Step
                </Button>
              </div>

              {form.steps.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No steps yet. Select a funnel type above or add steps manually.
                </div>
              ) : (
                <div className="space-y-2">
                  {form.steps.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => moveStep(i, -1)}
                          disabled={i === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => moveStep(i, 1)}
                          disabled={i === form.steps.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-muted-foreground">
                        {i + 1}
                      </span>
                      <Input
                        type="text"
                        placeholder="Step name"
                        value={step.name}
                        onChange={(e) => updateStep(i, "name", e.target.value)}
                        className="flex-1 h-7 text-xs"
                      />
                      <Select value={step.type} onValueChange={(v) => updateStep(i, "type", v)}>
                        <SelectTrigger size="sm" className="w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STEP_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        placeholder="URL pattern (optional)"
                        value={step.urlPattern}
                        onChange={(e) => updateStep(i, "urlPattern", e.target.value)}
                        className="w-48 h-7 font-mono text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeStep(i)}
                        className="text-muted-foreground hover:text-red"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setForm({ name: "", type: "CUSTOM", steps: [] });
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={createFunnel}
                disabled={!form.name || form.steps.length === 0 || saving}
              >
                {saving ? "Creating..." : "Create Funnel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing funnels */}
      {initialFunnels.length === 0 && !showForm ? (
        <Card className="border-border py-0">
          <div className="p-8 text-center text-sm text-muted-foreground">
            No funnels configured yet. Create one to start tracking multi-step conversions.
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {initialFunnels.map((funnel) => {
            const isExpanded = expandedFunnel === funnel.id;

            return (
              <Card
                key={funnel.id}
                className={cn(
                  "gap-0 py-0 transition-all duration-200",
                  funnel.isActive ? "border-border" : "border-border opacity-50"
                )}
              >
                {/* Header */}
                <div
                  className="flex cursor-pointer items-center justify-between p-4"
                  onClick={() => setExpandedFunnel(isExpanded ? null : funnel.id)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">{funnel.name}</h3>
                        <Badge variant="secondary" className="text-[10px]">
                          {funnel.type.replace("_", " ").toLowerCase()}
                        </Badge>
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            funnel.isActive ? "bg-green" : "bg-muted-foreground/40"
                          )}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground/60">
                        {funnel.steps.length} steps ·{" "}
                        {funnel._count.events} events ·{" "}
                        {funnel._count.experiments} tests
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFunnel(funnel.id, funnel.isActive);
                      }}
                      className={funnel.isActive ? "text-green hover:text-green" : "text-muted-foreground"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFunnel(funnel.id);
                      }}
                      className="text-muted-foreground hover:text-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground/60" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
                    )}
                  </div>
                </div>

                {/* Expanded steps */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 animate-fade-in">
                    <div className="space-y-1.5">
                      {funnel.steps.map((step, i) => (
                        <div
                          key={step.id || i}
                          className="flex items-center gap-3 rounded-lg bg-background px-3 py-2"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-muted-foreground">
                            {i + 1}
                          </span>
                          <span className="text-sm text-foreground">{step.name}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {step.type.replace(/_/g, " ")}
                          </Badge>
                          {step.urlPattern && (
                            <code className="ml-auto font-mono text-[11px] text-muted-foreground/60">
                              {step.urlPattern}
                            </code>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
