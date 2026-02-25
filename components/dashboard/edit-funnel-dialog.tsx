"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, ChevronUp, ChevronDown, X } from "lucide-react";
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

interface StepData {
  name: string;
  type: string;
  urlPattern: string;
}

interface Props {
  orgId: string;
  funnelId: string;
  initialName: string;
  initialType: string;
  initialSteps: StepData[];
}

export function EditFunnelDialog({
  orgId,
  funnelId,
  initialName,
  initialType,
  initialSteps,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: initialName,
    type: initialType,
    steps: initialSteps.map((s) => ({ ...s })),
  });

  // Reset form when dialog opens
  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setForm({
        name: initialName,
        type: initialType,
        steps: initialSteps.map((s) => ({ ...s })),
      });
    }
    setOpen(isOpen);
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

  async function save() {
    if (!form.name || form.steps.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/dashboard/${orgId}/funnels/${funnelId}`,
        {
          method: "PATCH",
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
        }
      );
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Edit Funnel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Funnel</DialogTitle>
        </DialogHeader>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v })}
            >
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
              No steps. Add steps to define the funnel flow.
            </div>
          ) : (
            <div className="space-y-2">
              {form.steps.map((step, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-background p-2.5"
                >
                  {/* Row 1: controls + name */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
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
                      className="h-7 flex-1 text-xs"
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
                  {/* Row 2: type + URL pattern */}
                  <div className="mt-1.5 flex items-center gap-2 pl-[68px]">
                    <Select
                      value={step.type}
                      onValueChange={(v) => updateStep(i, "type", v)}
                    >
                      <SelectTrigger className="h-7 w-[160px] text-xs">
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
                      className="h-7 flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={!form.name || form.steps.length === 0 || saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
