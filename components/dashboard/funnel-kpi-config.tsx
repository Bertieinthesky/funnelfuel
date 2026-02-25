"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2, ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MetricOption {
  id: string;
  name: string;
  kind: string;
  format: string;
}

interface Props {
  orgId: string;
  funnelId: string;
  allMetrics: MetricOption[];
  selectedMetricIds: string[];
}

export function FunnelKpiConfig({
  orgId,
  funnelId,
  allMetrics,
  selectedMetricIds,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(selectedMetricIds);
  const [saving, setSaving] = useState(false);

  function toggleMetric(metricId: string) {
    setSelected((prev) =>
      prev.includes(metricId)
        ? prev.filter((id) => id !== metricId)
        : [...prev, metricId]
    );
  }

  function moveMetric(index: number, direction: -1 | 1) {
    const newSelected = [...selected];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newSelected.length) return;
    [newSelected[index], newSelected[newIndex]] = [
      newSelected[newIndex],
      newSelected[index],
    ];
    setSelected(newSelected);
  }

  function removeMetric(metricId: string) {
    setSelected((prev) => prev.filter((id) => id !== metricId));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/dashboard/${orgId}/funnels/${funnelId}/kpis`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            selected.map((metricId, i) => ({ metricId, order: i }))
          ),
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-3.5 w-3.5" />
          Configure KPIs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Funnel KPIs</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Selected KPIs */}
          {selected.length > 0 && (
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Displayed KPIs ({selected.length})
              </label>
              <div className="space-y-1.5">
                {selected.map((metricId, i) => {
                  const m = allMetrics.find((m) => m.id === metricId);
                  if (!m) return null;
                  return (
                    <div
                      key={metricId}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => moveMetric(i, -1)}
                          disabled={i === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => moveMetric(i, 1)}
                          disabled={i === selected.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="flex-1 text-sm font-medium">
                        {m.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-secondary text-muted-foreground"
                      >
                        {m.kind}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeMetric(metricId)}
                        className="text-muted-foreground hover:text-red"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available metrics */}
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Available Metrics
            </label>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {allMetrics
                .filter((m) => !selected.includes(m.id))
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMetric(m.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <span className="flex-1 text-sm text-muted-foreground">
                      {m.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-secondary text-muted-foreground"
                    >
                      {m.kind}
                    </Badge>
                  </button>
                ))}
              {allMetrics.filter((m) => !selected.includes(m.id)).length ===
                0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  All metrics are selected
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save KPIs"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
