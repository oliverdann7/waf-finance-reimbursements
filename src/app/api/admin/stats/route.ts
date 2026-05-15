import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalReports, pendingReports, totalUsers, reports] = await Promise.all([
    prisma.report.count(),
    prisma.report.count({ where: { status: "SUBMITTED" } }),
    prisma.user.count(),
    prisma.report.findMany({
      where: { status: { not: "DRAFT" } },
      include: { user: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const paidReports = await prisma.report.findMany({
    where: { status: "PAID" },
    select: { totalReimbursable: true },
  });
  const totalPaid = paidReports.reduce((s, r) => s + r.totalReimbursable, 0);

  return NextResponse.json({
    totalReports,
    pendingReports,
    totalUsers,
    totalPaid,
    recentReports: reports.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      status: r.status,
      totalReimbursable: r.totalReimbursable,
      user: r.user,
    })),
  });
}
