import { NextRequest, NextResponse } from "next/server";
import { processPixelEvent } from "@/lib/pixel/process";
import { PixelPayloadSchema } from "@/lib/schemas/pixel";

function corsHeaders(origin: string | null) {
  // Echo the requesting origin back — required when sendBeacon sends cookies
  // (credentials mode 'include'). Wildcard '*' is rejected by browsers in that case.
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

// Handle CORS preflight for cross-origin pixel requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  // 1. Parse JSON
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 2. Validate schema
  const parsed = PixelPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    // Return 200 to never break client pages — but don't process garbage
    return NextResponse.json({ ok: false, error: "Invalid payload" }, {
      status: 200,
      headers: corsHeaders(origin),
    });
  }

  const payload = parsed.data;

  // 3. Get client IP and user agent
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  // 4. Process — unexpected errors return 500 so monitoring catches them,
  //    but we still return 200 to the browser (pixel errors should never break pages)
  try {
    const result = await processPixelEvent(payload, ip, userAgent);
    return NextResponse.json({ ok: result.ok }, {
      status: 200,
      headers: corsHeaders(origin),
    });
  } catch (err) {
    console.error("[pixel] Unhandled error:", err);
    return NextResponse.json({ ok: false }, {
      status: 200, // still 200 — never break client pages
      headers: corsHeaders(origin),
    });
  }
}
