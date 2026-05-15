import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [currentReport, draftCount, submittedCount, approvedCount, paidCount, allReports] =
    await Promise.all([
      prisma.report.findUnique({
        where: { userId_month_year: { userId, month: currentMonth, year: currentYear } },
        include: { _count: { select: { expenses: true } } },
      }),
      prisma.report.count({ where: { userId, status: "DRAFT" } }),
      prisma.report.count({ where: { userId, status: "SUBMITTED" } }),
      prisma.report.count({ where: { userId, status: "APPROVED" } }),
      prisma.report.count({ where: { userId, status: "PAID" } }),
      prisma.report.findMany({
        where: { userId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 6,
      }),
    ]);

  const missingReceipts = await prisma.expense.count({
    where: {
      userId,
      receipts: { none: {} },
      amountInTRY: { gt: 100 },
    },
  });

  const monthlyTotals = allReports.map((r) => ({
    month: r.month,
    year: r.year,
    total: r.totalReimbursable,
  }));

  return NextResponse.json({
    currentReport: currentReport
      ? {
          id: currentReport.id,
          month: currentReport.month,
          year: currentReport.year,
          status: currentReport.status,
          totalRequested: currentReport.totalRequested,
          totalReimbursable: currentReport.totalReimbursable,
          expenseCount: currentReport._count.expenses,
        }
      : null,
    draftCount,
    submittedCount,
    approvedCount,
    paidCount,
    missingReceipts,
    monthlyTotals,
  });
}
