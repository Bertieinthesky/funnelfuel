import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EventType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const sp = req.nextUrl.searchParams;

  // Build filters (mirrors contacts page logic)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { organizationId: orgId };

  const q = sp.get("q");
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const quality = sp.get("quality");
  if (quality) where.leadQuality = quality;

  const tag = sp.get("tag");
  if (tag) where.tags = { has: tag };

  const source = sp.get("source");
  const title = sp.get("title");
  if (source || title) {
    where.sessions = {
      some: {
        ...(source ? { ffSource: source } : {}),
        ...(title ? { ffTitle: title } : {}),
      },
    };
  }

  const eventType = sp.get("eventType");
  if (eventType && Object.values(EventType).includes(eventType as EventType)) {
    where.events = { some: { type: eventType as EventType } };
  }

  const contacts = await db.contact.findMany({
    where,
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      leadQuality: true,
      tags: true,
      createdAt: true,
      _count: { select: { events: true, payments: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  function escapeCSV(val: unknown): string {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headers = ["Name", "Email", "Phone", "Quality", "Tags", "Events", "Payments", "Sessions", "Created"];
  const rows = contacts.map((c) => [
    [c.firstName, c.lastName].filter(Boolean).join(" ") || "Anonymous",
    c.email || "",
    c.phone || "",
    c.leadQuality,
    c.tags.join("; "),
    c._count.events,
    c._count.payments,
    c._count.sessions,
    c.createdAt.toISOString().split("T")[0],
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map(escapeCSV).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
