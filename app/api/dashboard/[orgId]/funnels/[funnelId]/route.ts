import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FunnelType, FunnelStepType } from "@prisma/client";
import { z } from "zod";

const StepSchema = z.object({
  id: z.string().optional(), // existing step ID (for updates)
  name: z.string().min(1),
  type: z.nativeEnum(FunnelStepType),
  urlPattern: z.string().optional(),
  order: z.number().int().min(0),
});

const UpdateFunnelSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(FunnelType).optional(),
  isActive: z.boolean().optional(),
  steps: z.array(StepSchema).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; funnelId: string }> }
) {
  const { orgId, funnelId } = await params;
  const body = await req.json();
  const parsed = UpdateFunnelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { steps, ...funnelData } = parsed.data;

  // Update funnel fields
  const funnel = await db.funnel.updateMany({
    where: { id: funnelId, organizationId: orgId },
    data: funnelData,
  });

  if (funnel.count === 0) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
  }

  // If steps are provided, replace all steps
  if (steps) {
    await db.funnelStep.deleteMany({ where: { funnelId } });
    await db.funnelStep.createMany({
      data: steps.map((step, i) => ({
        funnelId,
        name: step.name,
        type: step.type,
        urlPattern: step.urlPattern,
        order: i,
      })),
    });
  }

  const updated = await db.funnel.findUnique({
    where: { id: funnelId },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; funnelId: string }> }
) {
  const { orgId, funnelId } = await params;

  const result = await db.funnel.deleteMany({
    where: { id: funnelId, organizationId: orgId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
