import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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
  const search = searchParams.get("search");

  const where: any = {};
  if (status) where.status = status;

  if (search) {
    where.user = { name: { contains: search } };
  }

  const reports = await prisma.report.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { expenses: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(
    reports.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      status: r.status,
      totalRequested: r.totalRequested,
      totalReimbursable: r.totalReimbursable,
      submissionDate: r.submissionDate,
      expenseCount: r._count.expenses,
      user: r.user,
    }))
  );
}
