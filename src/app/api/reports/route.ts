import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: any = { userId: session.user.id };
  if (status) where.status = status;

  const reports = await prisma.report.findMany({
    where,
    include: { _count: { select: { expenses: true } } },
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
      paymentDate: r.paymentDate,
      expenseCount: r._count.expenses,
    }))
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { month, year } = await req.json();

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    const existing = await prisma.report.findUnique({
      where: { userId_month_year: { userId: session.user.id, month, year } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A report for this month/year already exists" },
        { status: 409 }
      );
    }

    const report = await prisma.report.create({
      data: {
        month,
        year,
        userId: session.user.id,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
