"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, Save, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Rule {
  field: string;
  op: string;
  value: string;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  rules: Rule[];
  createdAt: string;
}

interface FilterOptions {
  sources: string[];
  titles: string[];
  tags: string[];
  funnels: { id: string; name: string }[];
}

const FIELDS = [
  { id: "source", label: "Source" },
  { id: "title", label: "Title" },
  { id: "funnel", label: "Funnel" },
  { id: "tag", label: "Tag" },
  { id: "url", label: "URL" },
  { id: "eventType", label: "Event Type" },
];

const OPERATORS = [
  { id: "eq", label: "equals" },
  { id: "neq", label: "does not equal" },
  { id: "contains", label: "contains" },
  { id: "not_contains", label: "does not contain" },
];

const EVENT_TYPES = [
  "PAGE_VIEW", "FORM_SUBMIT", "OPT_IN", "CHECKOUT_VIEW", "PURCHASE",
  "BOOKING", "BOOKING_CONFIRMED", "APPLICATION_SUBMIT",
  "WEBINAR_REGISTER", "WEBINAR_ATTEND", "WEBINAR_CTA_CLICK",
];

function RuleLabel({ rule, funnels }: { rule: Rule; funnels: { id: string; name: string }[] }) {
  const fieldLabel = FIELDS.find((f) => f.id === rule.field)?.label ?? rule.field;
  const opLabel = OPERATORS.find((o) => o.id === rule.op)?.label ?? rule.op;
  let valueLabel = rule.value;
  if (rule.field === "funnel") {
    valueLabel = funnels.find((f) => f.id === rule.value)?.name ?? rule.value;
  }
  return (
    <span className="text-xs">
      <span className="font-medium text-foreground">{fieldLabel}</span>{" "}
      <span className="text-muted-foreground">{opLabel}</span>{" "}
      <span className="font-medium text-primary">{valueLabel}</span>
    </span>
  );
}

export function SegmentBuilder({
  orgId,
  segments: initialSegments,
  filterOptions,
}: {
  orgId: string;
  segments: Segment[];
  filterOptions: FilterOptions;
}) {
  const router = useRouter();
  const [segments, setSegments] = useState(initialSegments);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    rules: [{ field: "source", op: "eq", value: "" }] as Rule[],
  });

  function resetForm() {
    setForm({
      name: "",
      description: "",
      rules: [{ field: "source", op: "eq", value: "" }],
    });
    setEditId(null);
  }

  function openEdit(segment: Segment) {
    setEditId(segment.id);
    setForm({
      name: segment.name,
      description: segment.description ?? "",
      rules: segment.rules.map((r) => ({ ...r })),
    });
    setOpen(true);
  }

  function addRule() {
    setForm({
      ...form,
      rules: [...form.rules, { field: "source", op: "eq", value: "" }],
    });
  }

  function removeRule(index: number) {
    setForm({ ...form, rules: form.rules.filter((_, i) => i !== index) });
  }

  function updateRule(index: number, field: string, value: string) {
    const rules = [...form.rules];
    rules[index] = { ...rules[index], [field]: value };
    setForm({ ...form, rules });
  }

  function getValueOptions(field: string) {
    switch (field) {
      case "source":
        return filterOptions.sources;
      case "title":
        return filterOptions.titles;
      case "tag":
        return filterOptions.tags;
      case "eventType":
        return EVENT_TYPES;
      default:
        return [];
    }
  }

  async function save() {
    if (!form.name || form.rules.length === 0 || form.rules.some((r) => !r.value)) return;
    setSaving(true);
    try {
      const url = editId
        ? `/api/dashboard/${orgId}/segments/${editId}`
        : `/api/dashboard/${orgId}/segments`;
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        if (editId) {
          setSegments(segments.map((s) => (s.id === editId ? data : s)));
        } else {
          setSegments([data, ...segments]);
        }
        setOpen(false);
        resetForm();
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteSegment(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/dashboard/${orgId}/segments/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSegments(segments.filter((s) => s.id !== id));
        router.refresh();
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            Create Segment
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Segment" : "Create Segment"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Name
                </label>
                <Input
                  placeholder="e.g. Facebook Leads"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Description
                </label>
                <Input
                  placeholder="Optional description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Rules ({form.rules.length})
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addRule}
                  className="text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Add Rule
                </Button>
              </div>

              <div className="space-y-2">
                {form.rules.map((rule, i) => {
                  const valueOptions = getValueOptions(rule.field);
                  const isFreeText =
                    rule.field === "url" ||
                    (rule.field === "funnel"
                      ? false
                      : valueOptions.length === 0);

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
                    >
                      {i > 0 && (
                        <span className="text-[10px] font-medium text-muted-foreground/60">
                          AND
                        </span>
                      )}
                      <Select
                        value={rule.field}
                        onValueChange={(v) => updateRule(i, "field", v)}
                      >
                        <SelectTrigger className="h-7 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELDS.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={rule.op}
                        onValueChange={(v) => updateRule(i, "op", v)}
                      >
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {rule.field === "funnel" ? (
                        <Select
                          value={rule.value}
                          onValueChange={(v) => updateRule(i, "value", v)}
                        >
                          <SelectTrigger className="h-7 flex-1 text-xs">
                            <SelectValue placeholder="Select funnel" />
                          </SelectTrigger>
                          <SelectContent>
                            {filterOptions.funnels.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : isFreeText ? (
                        <Input
                          placeholder="Value"
                          value={rule.value}
                          onChange={(e) =>
                            updateRule(i, "value", e.target.value)
                          }
                          className="h-7 flex-1 text-xs"
                        />
                      ) : (
                        <Select
                          value={rule.value}
                          onValueChange={(v) => updateRule(i, "value", v)}
                        >
                          <SelectTrigger className="h-7 flex-1 text-xs">
                            <SelectValue placeholder="Select value" />
                          </SelectTrigger>
                          <SelectContent>
                            {valueOptions.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeRule(i)}
                        className="text-muted-foreground hover:text-red"
                        disabled={form.rules.length === 1}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                All rules must match (AND logic). Contacts must satisfy every
                rule to be included in this segment.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={
                  saving ||
                  !form.name ||
                  form.rules.length === 0 ||
                  form.rules.some((r) => !r.value)
                }
              >
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Save className="h-3 w-3" />
                    {editId ? "Update" : "Create"}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Segment List */}
      {segments.length === 0 ? (
        <Card className="border-border py-0">
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No segments created yet.</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Segments let you define reusable audience groups based on source,
              funnel, URL, tags, and more.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {segments.map((segment) => (
            <Card key={segment.id} className="gap-0 border-border py-0">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">
                      {segment.name}
                    </h3>
                    {segment.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground/60">
                        {segment.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEdit(segment)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteSegment(segment.id)}
                      className="text-muted-foreground hover:text-red"
                      disabled={deleting === segment.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {segment.rules.map((rule, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="gap-1 bg-secondary"
                    >
                      <RuleLabel
                        rule={rule}
                        funnels={filterOptions.funnels}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
