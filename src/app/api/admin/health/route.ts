import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint to check why /admin might fail.
 * Call GET /api/admin/health to see which services are OK.
 */
export async function GET() {
  const checks: Record<string, string> = {};

  checks.DATABASE_URL = process.env.DATABASE_URL ? "set" : "MISSING";
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? "set" : "MISSING";
  checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL?.trim() ? "set" : "MISSING";

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: false,
      checks,
      error: "DATABASE_URL is not set",
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db_connection = "ok";
  } catch (e) {
    checks.db_connection = "FAIL";
    checks.db_error = e instanceof Error ? e.message : String(e);
  }

  const ok =
    checks.DATABASE_URL === "set" &&
    checks.NEXTAUTH_SECRET === "set" &&
    checks.NEXTAUTH_URL !== "MISSING" &&
    checks.db_connection === "ok";

  return NextResponse.json({
    ok,
    checks,
  });
}
