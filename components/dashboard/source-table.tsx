"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { ArrowUpDown } from "lucide-react";

interface SourceRow {
  source: string;
  visitors: number;
  leads: number;
  purchases: number;
  revenue: number;
  rpl: number;
  rpv: number;
}

type SortKey = keyof Omit<SourceRow, "source">;

const columns: { key: SortKey; label: string; format: (v: number) => string }[] = [
  { key: "visitors", label: "Visitors", format: (v) => v.toLocaleString() },
  { key: "leads", label: "Leads", format: (v) => v.toLocaleString() },
  { key: "purchases", label: "Sales", format: (v) => v.toLocaleString() },
  { key: "revenue", label: "Revenue", format: (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { key: "rpl", label: "Rev/Lead", format: (v) => `$${v.toFixed(2)}` },
  { key: "rpv", label: "Rev/Visitor", format: (v) => `$${v.toFixed(2)}` },
];

export function SourceTable({ data }: { data: SourceRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...data].sort((a, b) =>
    sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-muted">
        No source data yet. Events will appear here once traffic starts flowing.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">
              Source
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className="cursor-pointer px-4 py-3 text-right text-xs font-medium text-text-muted transition-colors hover:text-text"
                onClick={() => toggleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <ArrowUpDown
                    className={cn(
                      "h-3 w-3",
                      sortKey === col.key ? "text-accent" : "text-text-dim"
                    )}
                  />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={row.source}
              className={cn(
                "border-b border-border transition-colors last:border-0 hover:bg-surface-elevated",
                i === 0 && "bg-accent-dim/30"
              )}
            >
              <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      row.source === "direct"
                        ? "bg-text-dim"
                        : i === 0
                          ? "bg-accent"
                          : "bg-text-muted"
                    )}
                  />
                  {row.source}
                </div>
              </td>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-right tabular-nums",
                    col.key === "revenue" ? "font-medium" : "text-text-muted"
                  )}
                >
                  {col.format(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
