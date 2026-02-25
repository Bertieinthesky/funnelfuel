import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MetricKind, MetricAggregation, MetricFormat, EventType } from "@prisma/client";
import { z } from "zod";

const UpdateMetricSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  kind: z.nativeEnum(MetricKind).optional(),
  eventType: z.nativeEnum(EventType).optional(),
  aggregation: z.nativeEnum(MetricAggregation).optional(),
  valueProperty: z.string().optional(),
  numeratorMetricId: z.string().optional(),
  denominatorMetricId: z.string().optional(),
  productFilter: z.string().optional(),
  format: z.nativeEnum(MetricFormat).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; metricId: string }> }
) {
  const { orgId, metricId } = await params;
  const body = await req.json();
  const parsed = UpdateMetricSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const metric = await db.metric.update({
    where: { id: metricId, organizationId: orgId },
    data: parsed.data,
  });

  return NextResponse.json(metric);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; metricId: string }> }
) {
  const { orgId, metricId } = await params;

  // Check if this metric is used as numerator or denominator by other metrics
  const dependents = await db.metric.count({
    where: {
      organizationId: orgId,
      OR: [
        { numeratorMetricId: metricId },
        { denominatorMetricId: metricId },
      ],
    },
  });

  if (dependents > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${dependents} other metric(s) depend on this metric as part of a calculation.`,
      },
      { status: 409 }
    );
  }

  await db.metric.delete({
    where: { id: metricId, organizationId: orgId },
  });

  return NextResponse.json({ ok: true });
}
