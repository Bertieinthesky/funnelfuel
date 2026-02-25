import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AlertType } from "@prisma/client";
import { z } from "zod";

const UpdateAlertSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.nativeEnum(AlertType).optional(),
  thresholdHours: z.number().int().min(1).max(168).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; alertId: string }> }
) {
  const { orgId, alertId } = await params;
  const body = await req.json();
  const parsed = UpdateAlertSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await db.alert.updateMany({
    where: { id: alertId, organizationId: orgId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const updated = await db.alert.findUnique({ where: { id: alertId } });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; alertId: string }> }
) {
  const { orgId, alertId } = await params;

  const result = await db.alert.deleteMany({
    where: { id: alertId, organizationId: orgId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
