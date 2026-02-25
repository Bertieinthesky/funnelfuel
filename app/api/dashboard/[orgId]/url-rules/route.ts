import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EventType } from "@prisma/client";
import { z } from "zod";

const CreateRuleSchema = z.object({
  name: z.string().min(1),
  matchType: z.enum(["contains", "exact"]).default("contains"),
  pattern: z.string().min(1),
  excludePattern: z.string().optional(),
  ignoreCase: z.boolean().default(true),
  ignoreQuery: z.boolean().default(true),
  eventType: z.nativeEnum(EventType),
  tags: z.array(z.string()).default([]),
  funnelStepId: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  const rules = await db.urlRule.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rules);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const body = await req.json();
  const parsed = CreateRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rule = await db.urlRule.create({
    data: {
      organizationId: orgId,
      ...parsed.data,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
