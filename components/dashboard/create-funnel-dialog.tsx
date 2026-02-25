"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronUp, ChevronDown, X } from "lucide-react";
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

const FUNNEL_TYPES = [
  { value: "LOW_TICKET", label: "Low Ticket" },
  { value: "WEBINAR", label: "Webinar" },
  { value: "VSL_APPLICATION", label: "VSL / Application" },
  { value: "WORKSHOP", label: "Workshop" },
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

const TEMPLATES: Record<
  string,
  { steps: { name: string; type: string; urlPattern: string }[] }
> = {
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
      {
        name: "Registered",
        type: "WEBINAR_REGISTER",
        urlPattern: "**/registered*",
      },
      { name: "Attended", type: "WEBINAR_ATTEND", urlPattern: "" },
      { name: "CTA Click", type: "WEBINAR_CTA_CLICK", urlPattern: "" },
      {
        name: "Application",
        type: "APPLICATION_SUBMIT",
        urlPattern: "**/apply*",
      },
      {
        name: "Booking",
        type: "BOOKING_CONFIRMED",
        urlPattern: "**/booked*",
      },
    ],
  },
  VSL_APPLICATION: {
    steps: [
      { name: "VSL Page", type: "LANDING_PAGE", urlPattern: "" },
      {
        name: "Application",
        type: "APPLICATION_SUBMIT",
        urlPattern: "**/apply*",
      },
      { name: "Booking", type: "BOOKING", urlPattern: "**/book*" },
      {
        name: "Booking Confirmed",
        type: "BOOKING_CONFIRMED",
        urlPattern: "**/confirmed*",
      },
    ],
  },
  WORKSHOP: {
    steps: [
      { name: "Landing Page", type: "LANDING_PAGE", urlPattern: "" },
      { name: "Registration", type: "OPT_IN", urlPattern: "" },
      { name: "Purchase", type: "PURCHASE", urlPattern: "**/thank-you*" },
    ],
  },
  CUSTOM: { steps: [] },
};

interface Props {
  orgId: string;
}

export function CreateFunnelDialog({ orgId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
      steps: [...form.steps, { name: "", type: "CUSTOM", urlPattern: "" }],
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
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" />
          Add Funnel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Funnel</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2 mt-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Funnel name
            </label>
            <Input
              type="text"
              placeholder="e.g. Main Webinar Funnel"
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
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] text-muted-foreground/60">
              Selecting a type pre-fills common steps
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Funnel steps ({form.steps.length})
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
                  <Select
                    value={step.type}
                    onValueChange={(v) => updateStep(i, "type", v)}
                  >
                    <SelectTrigger className="w-[140px] text-xs h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STEP_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    placeholder="URL pattern (optional)"
                    value={step.urlPattern}
                    onChange={(e) =>
                      updateStep(i, "urlPattern", e.target.value)
                    }
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
              setOpen(false);
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
      </DialogContent>
    </Dialog>
  );
}
