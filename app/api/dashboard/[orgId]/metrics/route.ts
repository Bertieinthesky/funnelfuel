import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EventType, MetricKind, MetricAggregation, MetricFormat } from "@prisma/client";
import { z } from "zod";

const CreateMetricSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  kind: z.nativeEnum(MetricKind),
  eventType: z.nativeEnum(EventType).optional(),
  aggregation: z.nativeEnum(MetricAggregation).optional(),
  valueProperty: z.string().optional(),
  numeratorMetricId: z.string().optional(),
  denominatorMetricId: z.string().optional(),
  productFilter: z.string().optional(),
  format: z.nativeEnum(MetricFormat).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  const metrics = await db.metric.findMany({
    where: { organizationId: orgId },
    include: {
      numeratorMetric: { select: { id: true, name: true } },
      denominatorMetric: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(metrics);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const body = await req.json();
  const parsed = CreateMetricSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { kind, numeratorMetricId, denominatorMetricId, eventType, ...rest } =
    parsed.data;

  // Validate calculated metrics have both references
  if (kind === "CALCULATED" && (!numeratorMetricId || !denominatorMetricId)) {
    return NextResponse.json(
      { error: "Calculated metrics require both numerator and denominator" },
      { status: 400 }
    );
  }

  // Validate event metrics have an event type
  if (kind === "EVENT" && !eventType) {
    return NextResponse.json(
      { error: "Event metrics require an event type" },
      { status: 400 }
    );
  }

  const metric = await db.metric.create({
    data: {
      organizationId: orgId,
      kind,
      eventType: kind === "EVENT" ? eventType : undefined,
      numeratorMetricId:
        kind === "CALCULATED" ? numeratorMetricId : undefined,
      denominatorMetricId:
        kind === "CALCULATED" ? denominatorMetricId : undefined,
      ...rest,
    },
  });

  return NextResponse.json(metric, { status: 201 });
}
