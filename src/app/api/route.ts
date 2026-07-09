import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, unknown> = { ok: true };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.db = "up";
  } catch (err) {
    checks.db = "down";
    checks.ok = false;
  }

  const status = checks.ok ? 200 : 503;
  return NextResponse.json(checks, { status });
}
