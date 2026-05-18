import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const churchId = searchParams.get("churchId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (status && status !== "all") where.status = status;
  if (churchId) where.churchId = churchId;
  if (month) where.month = parseInt(month);
  if (year) where.year = parseInt(year);
  if (search) {
    where.church = { name: { contains: search, mode: "insensitive" } };
  }

  const reports = await prisma.churchMonthlyFinancialReport.findMany({
    where,
    include: {
      church: { select: { id: true, name: true, code: true, city: true } },
      titheOfferingDetails: { select: { id: true, type: true, amount: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(reports);
}
