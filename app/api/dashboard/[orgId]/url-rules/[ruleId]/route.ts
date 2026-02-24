import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EventType } from "@prisma/client";
import { z } from "zod";

const UpdateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  pattern: z.string().min(1).optional(),
  excludePattern: z.string().nullable().optional(),
  eventType: z.nativeEnum(EventType).optional(),
  tags: z.array(z.string()).optional(),
  funnelStepId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; ruleId: string }> }
) {
  const { orgId, ruleId } = await params;
  const body = await req.json();
  const parsed = UpdateRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rule = await db.urlRule.updateMany({
    where: { id: ruleId, organizationId: orgId },
    data: parsed.data,
  });

  if (rule.count === 0) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; ruleId: string }> }
) {
  const { orgId, ruleId } = await params;

  const result = await db.urlRule.deleteMany({
    where: { id: ruleId, organizationId: orgId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
