"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  orgId: string;
  funnelId: string;
  currentStatus: string;
}

const STATUSES = [
  { value: "ACTIVE", label: "Active", dot: "bg-green" },
  { value: "PAUSED", label: "Paused", dot: "bg-yellow" },
  { value: "ARCHIVED", label: "Archived", dot: "bg-muted-foreground/40" },
];

export function FunnelStatusSelect({
  orgId,
  funnelId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onChange(status: string) {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/dashboard/${orgId}/funnels/${funnelId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={onChange}
      disabled={saving}
    >
      <SelectTrigger className="h-7 w-[120px] text-xs">
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                STATUSES.find((s) => s.value === currentStatus)?.dot ??
                  "bg-green"
              )}
            />
            {STATUSES.find((s) => s.value === currentStatus)?.label ??
              "Active"}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  s.dot
                )}
              />
              {s.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
