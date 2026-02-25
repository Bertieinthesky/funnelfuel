import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AlertType } from "@prisma/client";
import { z } from "zod";

const CreateAlertSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.nativeEnum(AlertType),
  funnelId: z.string().optional(),
  funnelStepId: z.string().optional(),
  thresholdHours: z.number().int().min(1).max(168).default(24),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const alerts = await db.alert.findMany({
    where: { organizationId: orgId },
    include: {
      funnel: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(alerts);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const body = await req.json();
  const parsed = CreateAlertSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const alert = await db.alert.create({
    data: {
      organizationId: orgId,
      name: parsed.data.name,
      type: parsed.data.type,
      funnelId: parsed.data.funnelId || null,
      funnelStepId: parsed.data.funnelStepId || null,
      thresholdHours: parsed.data.thresholdHours,
    },
  });

  return NextResponse.json(alert, { status: 201 });
}
