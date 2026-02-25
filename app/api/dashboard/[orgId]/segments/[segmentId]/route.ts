import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const RuleSchema = z.object({
  field: z.enum(["source", "title", "funnel", "tag", "url", "eventType"]),
  op: z.enum(["eq", "neq", "contains", "not_contains"]),
  value: z.string().min(1),
});

const UpdateSegmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  rules: z.array(RuleSchema).min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; segmentId: string }> }
) {
  const { orgId, segmentId } = await params;
  const body = await req.json();
  const parsed = UpdateSegmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await db.segment.updateMany({
    where: { id: segmentId, organizationId: orgId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }

  const updated = await db.segment.findUnique({ where: { id: segmentId } });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; segmentId: string }> }
) {
  const { orgId, segmentId } = await params;

  const result = await db.segment.deleteMany({
    where: { id: segmentId, organizationId: orgId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
