import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FunnelType, FunnelStepType } from "@prisma/client";
import { z } from "zod";

const StepSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(FunnelStepType),
  urlPattern: z.string().optional(),
  order: z.number().int().min(0),
});

const CreateFunnelSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(FunnelType),
  steps: z.array(StepSchema).min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  const funnels = await db.funnel.findMany({
    where: { organizationId: orgId },
    include: {
      steps: { orderBy: { order: "asc" } },
      _count: { select: { events: true, experiments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(funnels);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const body = await req.json();
  const parsed = CreateFunnelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const funnel = await db.funnel.create({
    data: {
      organizationId: orgId,
      name: parsed.data.name,
      type: parsed.data.type,
      steps: {
        create: parsed.data.steps.map((step, i) => ({
          name: step.name,
          type: step.type,
          urlPattern: step.urlPattern,
          order: i,
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(funnel, { status: 201 });
}
