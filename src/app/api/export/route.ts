import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

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
      expenses: { include: { receipts: true }, orderBy: { date: "asc" } },
      user: true,
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isOwner = report.userId === session.user.id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "TREASURER"].includes(session.user.role || "");

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const categoryTotals = new Map<string, { requested: number; reimbursable: number; count: number }>();
  for (const expense of report.expenses) {
    const current = categoryTotals.get(expense.category) || { requested: 0, reimbursable: 0, count: 0 };
    current.requested += expense.amountInTRY;
    current.reimbursable += expense.reimbursableAmount;
    current.count += 1;
    categoryTotals.set(expense.category, current);
  }

  const rows: unknown[][] = [
    ["WAF Finance Reimbursement Export"],
    ["Worker Name", report.user.name],
    ["Worker Email", report.user.email],
    ["Worker City", report.user.city],
    ["Worker Department", report.user.department],
    ["Month", report.month],
    ["Year", report.year],
    ["Status", report.status],
    ["Total Requested", report.totalRequested.toFixed(2)],
    ["Total Reimbursable", report.totalReimbursable.toFixed(2)],
    ["Submission Date", report.submissionDate?.toISOString() || ""],
    ["Approval Date", report.approvalDate?.toISOString() || ""],
    ["Payment Date", report.paymentDate?.toISOString() || ""],
    [],
    ["Category Summary"],
    ["Category", "Expense Count", "Requested (TRY)", "Reimbursable (TRY)"],
    ...[...categoryTotals.entries()].map(([category, totals]) => [
      category,
      totals.count,
      totals.requested.toFixed(2),
      totals.reimbursable.toFixed(2),
    ]),
    [],
    ["Expense Line Items"],
    [
      "Date",
      "Merchant",
      "Category",
      "Description",
      "Amount",
      "Currency",
      "Amount (TRY)",
      "Reimbursable (TRY)",
      "Approval Status",
      "Receipt Count",
      "Receipt Checklist",
    ],
  ];

  for (const expense of report.expenses) {
    rows.push([
      new Date(expense.date).toISOString().split("T")[0],
      expense.merchant,
      expense.category,
      expense.description,
      expense.amount.toFixed(2),
      expense.currency,
      expense.amountInTRY.toFixed(2),
      expense.reimbursableAmount.toFixed(2),
      expense.status,
      expense.receipts.length,
      expense.receipts.length > 0 ? expense.receipts.map((receipt) => receipt.originalName).join("; ") : "MISSING RECEIPT",
    ]);
  }

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const extension = format === "excel" ? "csv" : "csv";

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waf-report-${report.year}-${report.month}-${reportId}.${extension}"`,
    },
  });
}
