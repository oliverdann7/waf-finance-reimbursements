import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

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
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const city = searchParams.get("city");
  const category = searchParams.get("category");

  const where: Prisma.ReportWhereInput = {};
  if (status && status !== "all") where.status = status as Prisma.EnumReportStatusFilter["equals"];
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);
  if (search || city) {
    where.user = {
      ...(search ? { name: { contains: search } } : {}),
      ...(city ? { city: { contains: city } } : {}),
    };
  }
  if (category) {
    where.expenses = { some: { category } };
  }

  const reports = await prisma.report.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, city: true } },
      expenses: { select: { status: true, receipts: { select: { id: true } }, amountInTRY: true } },
      _count: { select: { expenses: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(
    reports.map((report) => {
      const missingReceiptCount = report.expenses.filter((expense) => expense.receipts.length === 0).length;
      const rejectedCount = report.expenses.filter((expense) => expense.status === "REJECTED").length;
      const highRiskWarnings = missingReceiptCount + rejectedCount;

      return {
        id: report.id,
        month: report.month,
        year: report.year,
        status: report.status,
        totalRequested: report.totalRequested,
        totalReimbursable: report.totalReimbursable,
        submissionDate: report.submissionDate,
        expenseCount: report._count.expenses,
        missingReceiptCount,
        highRiskWarnings,
        user: report.user,
      };
    })
  );
}
