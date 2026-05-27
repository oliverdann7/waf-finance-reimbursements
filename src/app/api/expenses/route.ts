import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateReimbursableAmount, checkDuplicates, evaluateExpenseRules, getRules } from "@/lib/rules";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { date, merchant, description, category, amount, currency, exchangeRate, reportId, receiptId } = await req.json();

    if (!date || !merchant || !category || !amount || !reportId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const report = await prisma.report.findFirst({
      where: { id: reportId, userId: session.user.id, status: "DRAFT" },
    });
    if (!report) {
      return NextResponse.json({ error: "Draft report not found" }, { status: 404 });
    }

    const receipt = receiptId
      ? await prisma.receipt.findFirst({ where: { id: receiptId, userId: session.user.id } })
      : null;

    const amountInTRY = amount * (exchangeRate || 1);
    const rules = await getRules();
    const reimbursableAmount = calculateReimbursableAmount({ category, amount, amountInTRY, rules });

    const hasReceipt = Boolean(receipt);

    const [ruleResults, duplicateWarnings] = await Promise.all([
      evaluateExpenseRules({
        category,
        amount,
        amountInTRY,
        date: new Date(date),
        hasReceipt,
        userId: session.user.id,
        reportId,
      }),
      checkDuplicates({
        amount,
        date: new Date(date),
        merchant,
        userId: session.user.id,
        filename: receipt?.originalName,
        extractedText: receipt?.extractedText,
      }),
    ]);

    const warnings = [...ruleResults.warnings, ...duplicateWarnings];

    const expense = await prisma.expense.create({
      data: {
        date: new Date(date),
        merchant,
        description: description || "",
        category,
        amount,
        currency: currency || "TRY",
        exchangeRate: exchangeRate || 1,
        amountInTRY,
        reimbursableAmount,
        userId: session.user.id,
        reportId,
      },
    });

    if (receipt) {
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: { expenseId: expense.id },
      });
    }

    const allExpenses = await prisma.expense.findMany({ where: { reportId } });
    const totalRequested = allExpenses.reduce((s, e) => s + e.amountInTRY, 0);
    const totalReimbursable = allExpenses.reduce((s, e) => s + e.reimbursableAmount, 0);

    await prisma.report.update({
      where: { id: reportId },
      data: { totalRequested, totalReimbursable },
    });

    return NextResponse.json({ ...expense, reportId, warnings }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Expense ID required" }, { status: 400 });
  }

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.expense.delete({ where: { id } });

  const allExpenses = await prisma.expense.findMany({ where: { reportId: expense.reportId } });
  const totalRequested = allExpenses.reduce((s, e) => s + e.amountInTRY, 0);
  const totalReimbursable = allExpenses.reduce((s, e) => s + e.reimbursableAmount, 0);

  await prisma.report.update({
    where: { id: expense.reportId },
    data: { totalRequested, totalReimbursable },
  });

  return NextResponse.json({ success: true });
}
