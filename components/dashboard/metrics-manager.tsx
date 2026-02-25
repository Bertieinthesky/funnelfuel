"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowRight, Calculator, Activity, DollarSign, Pencil } from "lucide-react";
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

const AGGREGATION_OPTIONS = [
  { value: "TOTAL_EVENTS", label: "Total Events" },
  { value: "UNIQUE_CONTACTS", label: "Unique Contacts" },
  { value: "EVENT_VALUE_SUM", label: "Sum of Value" },
  { value: "EVENT_VALUE_AVG", label: "Average Value" },
] as const;

const FORMAT_OPTIONS = [
  { value: "NUMBER", label: "Number" },
  { value: "CURRENCY", label: "Currency ($)" },
  { value: "PERCENTAGE", label: "Percentage (%)" },
] as const;

const KIND_ICONS = {
  EVENT: Activity,
  REVENUE: DollarSign,
  CALCULATED: Calculator,
} as const;

const KIND_COLORS = {
  EVENT: "bg-blue-dim text-blue",
  REVENUE: "bg-green-dim text-green",
  CALCULATED: "bg-primary/10 text-primary",
} as const;

interface MetricData {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  eventType: string | null;
  aggregation: string;
  valueProperty: string | null;
  numeratorMetricId: string | null;
  denominatorMetricId: string | null;
  numeratorMetric?: { id: string; name: string } | null;
  denominatorMetric?: { id: string; name: string } | null;
  productFilter: string | null;
  format: string;
  createdAt: string;
}

interface Props {
  orgId: string;
  initialMetrics: MetricData[];
}

interface FormState {
  name: string;
  description: string;
  kind: string;
  eventType: string;
  aggregation: string;
  valueProperty: string;
  numeratorMetricId: string;
  denominatorMetricId: string;
  productFilter: string;
  format: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  kind: "EVENT",
  eventType: "PAGE_VIEW",
  aggregation: "TOTAL_EVENTS",
  valueProperty: "",
  numeratorMetricId: "",
  denominatorMetricId: "",
  productFilter: "",
  format: "NUMBER",
};

export function MetricsManager({ orgId, initialMetrics }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  }

  function startEdit(metric: MetricData) {
    setForm({
      name: metric.name,
      description: metric.description ?? "",
      kind: metric.kind,
      eventType: metric.eventType ?? "PAGE_VIEW",
      aggregation: metric.aggregation,
      valueProperty: metric.valueProperty ?? "",
      numeratorMetricId: metric.numeratorMetricId ?? "",
      denominatorMetricId: metric.denominatorMetricId ?? "",
      productFilter: metric.productFilter ?? "",
      format: metric.format,
    });
    setEditingId(metric.id);
    setShowForm(true);
  }

  async function saveMetric() {
    if (!form.name) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        kind: form.kind,
        format: form.format,
      };

      if (form.kind === "EVENT") {
        body.eventType = form.eventType;
        body.aggregation = form.aggregation;
        if (
          (form.aggregation === "EVENT_VALUE_SUM" ||
            form.aggregation === "EVENT_VALUE_AVG") &&
          form.valueProperty
        ) {
          body.valueProperty = form.valueProperty;
        }
      }

      if (form.kind === "REVENUE" && form.productFilter) {
        body.productFilter = form.productFilter;
      }

      if (form.kind === "CALCULATED") {
        body.numeratorMetricId = form.numeratorMetricId;
        body.denominatorMetricId = form.denominatorMetricId;
      }

      const url = editingId
        ? `/api/dashboard/${orgId}/metrics/${editingId}`
        : `/api/dashboard/${orgId}/metrics`;

      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        resetForm();
        setShowForm(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteMetric(metricId: string) {
    const res = await fetch(`/api/dashboard/${orgId}/metrics/${metricId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete metric");
    }
  }

  const isFormValid = () => {
    if (!form.name) return false;
    if (form.kind === "EVENT" && !form.eventType) return false;
    if (
      form.kind === "CALCULATED" &&
      (!form.numeratorMetricId || !form.denominatorMetricId)
    )
      return false;
    return true;
  };

  function getMetricDescription(metric: MetricData): string {
    if (metric.kind === "EVENT") {
      const agg =
        AGGREGATION_OPTIONS.find((a) => a.value === metric.aggregation)
          ?.label ?? metric.aggregation;
      return `${agg} of ${(metric.eventType ?? "").replace(/_/g, " ")}`;
    }
    if (metric.kind === "REVENUE") {
      return metric.productFilter
        ? `Revenue from "${metric.productFilter}"`
        : "Total revenue";
    }
    if (metric.kind === "CALCULATED") {
      const num = metric.numeratorMetric?.name ?? "?";
      const den = metric.denominatorMetric?.name ?? "?";
      return `${num} / ${den}`;
    }
    return "";
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-foreground">Metrics</h2>
          <p className="text-xs text-muted-foreground">
            Define metrics to track across your funnels and reports
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Metric
        </Button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card className="mb-4 gap-0 border-primary/30 py-0 animate-fade-in">
          <CardContent className="p-4">
            {editingId && (
              <p className="mb-3 text-xs font-medium text-primary">
                Editing metric
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Metric name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Revenue Per Lead"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Type
                </label>
                <Select
                  value={form.kind}
                  onValueChange={(v) => {
                    const newFormat =
                      v === "REVENUE"
                        ? "CURRENCY"
                        : v === "CALCULATED"
                          ? "NUMBER"
                          : "NUMBER";
                    setForm({ ...form, kind: v, format: newFormat });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EVENT">Event Count</SelectItem>
                    <SelectItem value="REVENUE">Revenue</SelectItem>
                    <SelectItem value="CALCULATED">Calculated (A / B)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Event-specific fields */}
              {form.kind === "EVENT" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      Event type
                    </label>
                    <Select
                      value={form.eventType}
                      onValueChange={(v) =>
                        setForm({ ...form, eventType: v })
                      }
                    >
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
                      Aggregation
                    </label>
                    <Select
                      value={form.aggregation}
                      onValueChange={(v) =>
                        setForm({ ...form, aggregation: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGGREGATION_OPTIONS.map((agg) => (
                          <SelectItem key={agg.value} value={agg.value}>
                            {agg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(form.aggregation === "EVENT_VALUE_SUM" ||
                    form.aggregation === "EVENT_VALUE_AVG") && (
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                        Value property (JSON key in event data)
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. amountCents"
                        value={form.valueProperty}
                        onChange={(e) =>
                          setForm({ ...form, valueProperty: e.target.value })
                        }
                        className="font-mono"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Revenue-specific fields */}
              {form.kind === "REVENUE" && (
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Product filter (optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Leave empty for all products"
                    value={form.productFilter}
                    onChange={(e) =>
                      setForm({ ...form, productFilter: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Calculated-specific fields */}
              {form.kind === "CALCULATED" && (
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Formula
                  </label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={form.numeratorMetricId}
                      onValueChange={(v) =>
                        setForm({ ...form, numeratorMetricId: v })
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Numerator metric" />
                      </SelectTrigger>
                      <SelectContent>
                        {initialMetrics
                          .filter((m) => m.kind !== "CALCULATED" && m.id !== editingId)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <span className="text-lg font-medium text-muted-foreground/60">
                      /
                    </span>
                    <Select
                      value={form.denominatorMetricId}
                      onValueChange={(v) =>
                        setForm({ ...form, denominatorMetricId: v })
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Denominator metric" />
                      </SelectTrigger>
                      <SelectContent>
                        {initialMetrics
                          .filter((m) => m.kind !== "CALCULATED" && m.id !== editingId)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    Result = Numerator divided by Denominator
                  </p>
                </div>
              )}

              {/* Description + format row */}
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Description (optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Revenue divided by total leads"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Display format
                </label>
                <Select
                  value={form.format}
                  onValueChange={(v) => setForm({ ...form, format: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveMetric}
                disabled={!isFormValid() || saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create Metric"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics list */}
      {initialMetrics.length === 0 && !showForm ? (
        <Card className="border-border py-0">
          <div className="p-8 text-center text-sm text-muted-foreground">
            No metrics defined yet. Add metrics to track across your funnels
            and reports.
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {initialMetrics.map((metric) => {
            const KindIcon =
              KIND_ICONS[metric.kind as keyof typeof KIND_ICONS] ?? Activity;
            const kindColor =
              KIND_COLORS[metric.kind as keyof typeof KIND_COLORS] ??
              "bg-secondary text-muted-foreground";
            const formatLabel =
              FORMAT_OPTIONS.find((f) => f.value === metric.format)?.label ??
              metric.format;

            return (
              <Card
                key={metric.id}
                className={cn(
                  "gap-0 border-border py-0 transition-all duration-200",
                  editingId === metric.id && "border-primary/30"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                          kindColor
                        )}
                      >
                        <KindIcon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-foreground">
                            {metric.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px]", kindColor)}
                          >
                            {metric.kind}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-secondary text-muted-foreground"
                          >
                            {formatLabel}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground/60">
                          {metric.description || getMetricDescription(metric)}
                        </p>
                        {metric.kind === "CALCULATED" &&
                          metric.numeratorMetric &&
                          metric.denominatorMetric && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <code className="rounded bg-background px-1.5 py-0.5 font-mono">
                                {metric.numeratorMetric.name}
                              </code>
                              <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                              <span className="text-muted-foreground/40">
                                /
                              </span>
                              <ArrowRight className="h-3 w-3 rotate-180 text-muted-foreground/40" />
                              <code className="rounded bg-background px-1.5 py-0.5 font-mono">
                                {metric.denominatorMetric.name}
                              </code>
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => startEdit(metric)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => deleteMetric(metric.id)}
                        className="text-muted-foreground hover:text-red"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
