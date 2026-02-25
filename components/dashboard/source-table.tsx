"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { ArrowUpDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

interface TitleRow {
  title: string;
  visitors: number;
  leads: number;
  purchases: number;
  revenue: number;
  rpl: number;
  rpv: number;
}

interface SourceRow {
  source: string;
  visitors: number;
  leads: number;
  purchases: number;
  revenue: number;
  rpl: number;
  rpv: number;
  titles?: TitleRow[];
}

type SortKey = "visitors" | "leads" | "purchases" | "revenue" | "rpl" | "rpv";

const columns: { key: SortKey; label: string; format: (v: number) => string }[] = [
  { key: "visitors", label: "Visitors", format: (v) => v.toLocaleString() },
  { key: "leads", label: "Leads", format: (v) => v.toLocaleString() },
  { key: "purchases", label: "Sales", format: (v) => v.toLocaleString() },
  { key: "revenue", label: "Revenue", format: (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { key: "rpl", label: "Rev/Lead", format: (v) => `$${v.toFixed(2)}` },
  { key: "rpv", label: "Rev/Visitor", format: (v) => `$${v.toFixed(2)}` },
];

interface Props {
  data: SourceRow[];
  orgId?: string;
}

export function SourceTable({ data, orgId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  function toggleExpand(source: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  }

  if (data.length === 0) {
    return (
      <Card className="border-border py-0">
        <div className="p-8 text-center text-sm text-muted-foreground">
          No source data yet. Events will appear here once traffic starts flowing.
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 border-border py-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-8 px-2" />
            <TableHead className="px-4 text-xs text-muted-foreground">
              Source
            </TableHead>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className="cursor-pointer px-4 text-right text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => toggleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <ArrowUpDown
                    className={cn(
                      "h-3 w-3",
                      sortKey === col.key ? "text-primary" : "text-muted-foreground/40"
                    )}
                  />
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row, i) => {
            const sourceHref = orgId
              ? `/dashboard/${orgId}/sources/${encodeURIComponent(row.source)}`
              : undefined;
            const hasTitles = row.titles && row.titles.length > 0;
            const isExpanded = expanded.has(row.source);

            return (
              <>
                <TableRow
                  key={row.source}
                  className={cn(
                    "border-border transition-colors",
                    i === 0 && "bg-primary/5",
                    sourceHref && "cursor-pointer hover:bg-secondary/50"
                  )}
                >
                  {/* Expand toggle */}
                  <TableCell className="w-8 px-2">
                    {hasTitles && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(row.source);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-secondary"
                      >
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 text-muted-foreground/60 transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </button>
                    )}
                  </TableCell>

                  <TableCell className="px-4 font-medium">
                    {sourceHref ? (
                      <Link href={sourceHref} className="flex items-center gap-2 hover:text-primary transition-colors">
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            row.source === "direct"
                              ? "bg-muted-foreground/40"
                              : i === 0
                                ? "bg-primary"
                                : "bg-muted-foreground"
                          )}
                        />
                        {row.source}
                        {hasTitles && (
                          <span className="text-[10px] text-muted-foreground/50">
                            {row.titles!.length} title{row.titles!.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            row.source === "direct"
                              ? "bg-muted-foreground/40"
                              : i === 0
                                ? "bg-primary"
                                : "bg-muted-foreground"
                          )}
                        />
                        {row.source}
                      </div>
                    )}
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "px-4 text-right tabular-nums",
                        col.key === "revenue" ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {sourceHref ? (
                        <Link href={sourceHref} className="block">
                          {col.format(row[col.key])}
                        </Link>
                      ) : (
                        col.format(row[col.key])
                      )}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Title sub-rows */}
                {isExpanded && hasTitles && row.titles!.map((title) => (
                  <TableRow
                    key={`${row.source}-${title.title}`}
                    className="border-border bg-secondary/30"
                  >
                    <TableCell className="w-8 px-2" />
                    <TableCell className="px-4 pl-10">
                      <span className="text-xs text-muted-foreground">
                        {title.title}
                      </span>
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "px-4 text-right tabular-nums text-xs",
                          col.key === "revenue" ? "text-foreground" : "text-muted-foreground/80"
                        )}
                      >
                        {col.format(title[col.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
