import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const org = await db.organization.findFirst({
      select: { id: true, name: true },
    });
    return NextResponse.json({
      ok: true,
      dbConnected: true,
      org: org ? { id: org.id, name: org.name } : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      dbConnected: false,
      error: message,
    }, { status: 500 });
  }
}
