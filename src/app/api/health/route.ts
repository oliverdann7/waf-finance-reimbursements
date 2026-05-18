import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
  };

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    checks.database = { status: "error", message: "DATABASE_URL is not set" };
    checks.status = "degraded";
    return NextResponse.json(checks, { status: 503 });
  }

  if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
    checks.database = { status: "error", message: `DATABASE_URL must start with postgresql:// (starts with "${dbUrl.slice(0, 20)}...")` };
    checks.status = "degraded";
    return NextResponse.json(checks, { status: 503 });
  }

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "ok",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    checks.database = { status: "error", message };
    checks.status = "degraded";
    return NextResponse.json(checks, { status: 503 });
  }

  try {
    const requiredTables = ["User", "Church", "ChurchMonthlyFinancialReport", "Report", "Expense", "Receipt", "ReimbursementRule", "ChurchDistributionConfig"];
    const result = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const existingTables = result.map((r: { table_name: string }) => r.table_name);
    const missing = requiredTables.filter((t) => !existingTables.includes(t));
    checks.tables = {
      status: missing.length === 0 ? "ok" : "warning",
      existing: existingTables.filter((t) => requiredTables.includes(t)),
      missing,
    };
    if (missing.length > 0) checks.status = "degraded";
  } catch {
    checks.tables = { status: "unknown", message: "Could not inspect tables" };
  }

  const httpStatus = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status: httpStatus });
}
