import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateKpisSchema = z.array(
  z.object({
    metricId: z.string(),
    order: z.number(),
  })
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; funnelId: string }> }
) {
  const { funnelId } = await params;

  const kpis = await db.funnelKpi.findMany({
    where: { funnelId },
    include: {
      metric: {
        include: {
          numeratorMetric: true,
          denominatorMetric: true,
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(kpis);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; funnelId: string }> }
) {
  const { funnelId } = await params;
  const body = await req.json();
  const parsed = UpdateKpisSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Delete existing KPIs and replace
  await db.funnelKpi.deleteMany({ where: { funnelId } });

  if (parsed.data.length > 0) {
    await db.funnelKpi.createMany({
      data: parsed.data.map((kpi) => ({
        funnelId,
        metricId: kpi.metricId,
        order: kpi.order,
      })),
    });
  }

  const kpis = await db.funnelKpi.findMany({
    where: { funnelId },
    include: { metric: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(kpis);
}
