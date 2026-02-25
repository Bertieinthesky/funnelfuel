"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StepCount, StepHealth } from "@/lib/dashboard/funnel-detail";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

interface SourceRow {
  source: string;
  visitors: number;
  leads: number;
  purchases: number;
  revenue: number;
  rpl: number;
}

interface Props {
  orgId: string;
  funnelId: string;
  steps: StepCount[];
  stepHealth?: StepHealth[];
  range?: string;
}

export function FunnelDetailTable({ orgId, funnelId, steps, stepHealth, range }: Props) {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);

  const fetchSources = useCallback(async () => {
    setLoadingSources(true);
    try {
      const params = new URLSearchParams();
      if (range) params.set("range", range);
      const res = await fetch(
        `/api/dashboard/${orgId}/funnels/${funnelId}/breakdown?${params}`
      );
      if (res.ok) {
        setSources(await res.json());
      }
    } finally {
      setLoadingSources(false);
    }
  }, [orgId, funnelId, range]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  return (
    <Card className="gap-0 border-border py-0">
      <CardContent className="p-4">
        <Tabs defaultValue="steps">
          <TabsList>
            <TabsTrigger value="steps">By Step</TabsTrigger>
            <TabsTrigger value="sources">By Source</TabsTrigger>
          </TabsList>

          <TabsContent value="steps" className="mt-3">
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">#</TableHead>
                    <TableHead className="text-[11px]">Step</TableHead>
                    <TableHead className="text-[11px] text-right">
                      Events
                    </TableHead>
                    {stepHealth && stepHealth.length > 0 && (
                      <TableHead className="text-[11px] text-right">
                        Prior Period
                      </TableHead>
                    )}
                    {stepHealth && stepHealth.length > 0 && (
                      <TableHead className="text-[11px] text-right">
                        vs Prior
                      </TableHead>
                    )}
                    <TableHead className="text-[11px] text-right">
                      Conv. Rate
                    </TableHead>
                    <TableHead className="text-[11px] text-right">
                      Dropoff
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {steps.map((step, i) => {
                    const health = stepHealth?.find(
                      (h) => h.stepId === step.id
                    );
                    return (
                      <TableRow key={step.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {step.order + 1}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {step.name}
                          </span>
                          <span className="ml-2 text-[10px] text-muted-foreground/60">
                            {step.type.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {step.count.toLocaleString()}
                        </TableCell>
                        {stepHealth && stepHealth.length > 0 && (
                          <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                            {health
                              ? health.previousCount.toLocaleString()
                              : "—"}
                          </TableCell>
                        )}
                        {stepHealth && stepHealth.length > 0 && (
                          <TableCell className="text-right text-sm">
                            {health ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 tabular-nums",
                                  health.changePct > 0 && "text-green",
                                  health.changePct < 0 && "text-red",
                                  health.changePct === 0 &&
                                    "text-muted-foreground/60"
                                )}
                              >
                                {health.changePct > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : health.changePct < 0 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : (
                                  <Minus className="h-3 w-3" />
                                )}
                                {health.changePct > 0 ? "+" : ""}
                                {health.changePct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right tabular-nums text-sm">
                          {step.cumulativePct.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {i > 0 ? (
                            <span className="text-destructive">
                              -{step.dropoffPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="mt-3">
            {loadingSources ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading...
              </div>
            ) : sources.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No source data available
              </div>
            ) : (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Source</TableHead>
                      <TableHead className="text-[11px] text-right">
                        Leads
                      </TableHead>
                      <TableHead className="text-[11px] text-right">
                        Purchases
                      </TableHead>
                      <TableHead className="text-[11px] text-right">
                        Revenue
                      </TableHead>
                      <TableHead className="text-[11px] text-right">
                        RPL
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map((src) => (
                      <TableRow key={src.source}>
                        <TableCell className="text-sm font-medium">
                          {src.source}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {src.leads.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {src.purchases.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-green">
                          $
                          {src.revenue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          $
                          {src.rpl.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
