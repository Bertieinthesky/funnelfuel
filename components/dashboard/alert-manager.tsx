"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Plus,
  Trash2,
  Loader2,
  Bell,
  BellOff,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
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

interface AlertData {
  id: string;
  name: string;
  type: string;
  thresholdHours: number;
  isActive: boolean;
  lastFiredAt: string | null;
  lastEventAt: string | null;
  funnelId: string | null;
  funnel: { id: string; name: string } | null;
  createdAt: string;
}

interface FunnelOption {
  id: string;
  name: string;
}

const ALERT_TYPES = [
  { value: "NO_EVENTS", label: "No Events", description: "Any event type" },
  { value: "NO_OPT_INS", label: "No Opt-ins", description: "Opt-ins or form submits" },
  { value: "NO_PURCHASES", label: "No Purchases", description: "Purchase events" },
  { value: "NO_BOOKINGS", label: "No Bookings", description: "Booking events" },
  { value: "NO_PAGE_VIEWS", label: "No Page Views", description: "Page view events" },
];

const THRESHOLD_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 4, label: "4 hours" },
  { value: 8, label: "8 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "3 days" },
  { value: 168, label: "7 days" },
];

export function AlertManager({
  orgId,
  alerts: initialAlerts,
  funnels,
}: {
  orgId: string;
  alerts: AlertData[];
  funnels: FunnelOption[];
}) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ checked: number; fired: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "NO_EVENTS",
    thresholdHours: 24,
    funnelId: "",
  });

  async function createAlert() {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/${orgId}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          thresholdHours: form.thresholdHours,
          funnelId: form.funnelId || undefined,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ name: "", type: "NO_EVENTS", thresholdHours: 24, funnelId: "" });
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleAlert(alertId: string, isActive: boolean) {
    const res = await fetch(`/api/dashboard/${orgId}/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setAlerts(
        alerts.map((a) =>
          a.id === alertId ? { ...a, isActive: !isActive } : a
        )
      );
    }
  }

  async function deleteAlert(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/dashboard/${orgId}/alerts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAlerts(alerts.filter((a) => a.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  }

  async function runCheck() {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch(`/api/dashboard/${orgId}/alerts/check`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setCheckResult(data);
        router.refresh();
      }
    } finally {
      setChecking(false);
    }
  }

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return "Never";
    const ms = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(ms / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Alert</DialogTitle>
            </DialogHeader>

            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  Alert name
                </label>
                <Input
                  placeholder="e.g. No purchases in 24h"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Alert type
                  </label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Threshold
                  </label>
                  <Select
                    value={String(form.thresholdHours)}
                    onValueChange={(v) =>
                      setForm({ ...form, thresholdHours: parseInt(v) })
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THRESHOLD_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={String(t.value)}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {funnels.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Funnel (optional)
                  </label>
                  <Select
                    value={form.funnelId || "all"}
                    onValueChange={(v) =>
                      setForm({ ...form, funnelId: v === "all" ? "" : v })
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All funnels</SelectItem>
                      {funnels.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={createAlert}
                  disabled={saving || !form.name}
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={runCheck} disabled={checking}>
          {checking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
          Check Now
        </Button>

        {checkResult && (
          <Badge
            variant="secondary"
            className={cn(
              checkResult.fired > 0
                ? "bg-red-dim text-red"
                : "bg-green-dim text-green"
            )}
          >
            {checkResult.fired > 0
              ? `${checkResult.fired} alert${checkResult.fired !== 1 ? "s" : ""} fired`
              : "All clear"}
          </Badge>
        )}
      </div>

      {/* Alert List */}
      {alerts.length === 0 ? (
        <Card className="border-border py-0">
          <div className="p-12 text-center">
            <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-muted-foreground">No alerts configured yet.</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Alerts notify you when expected events stop coming through.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const typeInfo = ALERT_TYPES.find((t) => t.value === alert.type);
            const isFiring =
              alert.lastFiredAt &&
              (!alert.lastEventAt ||
                new Date(alert.lastFiredAt) > new Date(alert.lastEventAt));

            return (
              <Card
                key={alert.id}
                className={cn(
                  "gap-0 border-border py-0",
                  !alert.isActive && "opacity-50"
                )}
              >
                <CardContent className="flex items-center gap-4 p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">
                        {alert.name}
                      </h3>
                      {isFiring && (
                        <Badge className="gap-1 bg-red-dim text-red border-0">
                          <AlertTriangle className="h-3 w-3" />
                          Firing
                        </Badge>
                      )}
                      {!isFiring && alert.isActive && alert.lastEventAt && (
                        <Badge className="gap-1 bg-green-dim text-green border-0">
                          <CheckCircle2 className="h-3 w-3" />
                          OK
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">
                      {typeInfo?.label} ·{" "}
                      {THRESHOLD_OPTIONS.find(
                        (t) => t.value === alert.thresholdHours
                      )?.label ?? `${alert.thresholdHours}h`}
                      {alert.funnel && (
                        <span> · {alert.funnel.name}</span>
                      )}
                      {alert.lastEventAt && (
                        <span>
                          {" "}
                          · Last event: {timeAgo(alert.lastEventAt)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => toggleAlert(alert.id, alert.isActive)}
                      title={alert.isActive ? "Disable" : "Enable"}
                    >
                      {alert.isActive ? (
                        <Bell className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <BellOff className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteAlert(alert.id)}
                      className="text-muted-foreground hover:text-red"
                      disabled={deleting === alert.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
