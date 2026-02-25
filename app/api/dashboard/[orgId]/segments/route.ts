import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const RuleSchema = z.object({
  field: z.enum(["source", "title", "funnel", "tag", "url", "eventType"]),
  op: z.enum(["eq", "neq", "contains", "not_contains"]),
  value: z.string().min(1),
});

const CreateSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  rules: z.array(RuleSchema).min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const segments = await db.segment.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(segments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const body = await req.json();
  const parsed = CreateSegmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const segment = await db.segment.create({
    data: {
      organizationId: orgId,
      name: parsed.data.name,
      description: parsed.data.description,
      rules: parsed.data.rules,
    },
  });

  return NextResponse.json(segment, { status: 201 });
}
