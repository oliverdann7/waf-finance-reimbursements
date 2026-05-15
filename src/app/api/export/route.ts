import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("reportId");
  const format = searchParams.get("format") || "csv";

  if (!reportId) {
    return NextResponse.json({ error: "Report ID required" }, { status: 400 });
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      expenses: true,
      user: true,
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isOwner = report.userId === session.user.id;
  const isAdmin =
    session.user.role === "ADMIN" ||
    session.user.role === "SUPER_ADMIN" ||
    session.user.role === "TREASURER";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = [
    ["Field", "Value"],
    ["Worker Name", report.user.name],
    ["Worker Email", report.user.email],
    ["Month", report.month],
    ["Year", report.year],
    ["Status", report.status],
    ["Total Requested", report.totalRequested.toFixed(2)],
    ["Total Reimbursable", report.totalReimbursable.toFixed(2)],
    ["Submission Date", report.submissionDate?.toISOString() || ""],
    ["Approval Date", report.approvalDate?.toISOString() || ""],
    ["Payment Date", report.paymentDate?.toISOString() || ""],
    [],
    ["Date", "Merchant", "Category", "Amount", "Currency", "Amount (TRY)", "Reimbursable", "Status"],
  ];

  for (const expense of report.expenses) {
    rows.push([
      new Date(expense.date).toISOString().split("T")[0],
      expense.merchant,
      expense.category,
      expense.amount.toString(),
      expense.currency,
      expense.amountInTRY.toFixed(2),
      expense.reimbursableAmount.toFixed(2),
      expense.status,
    ]);
  }

  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="report-${reportId}.csv"`,
    },
  });
}
