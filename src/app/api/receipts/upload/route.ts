import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { processReceipt } from "@/lib/ocr";
import { isAcceptedReceiptType, storeReceiptFile } from "@/lib/storage";
import { checkDuplicates } from "@/lib/rules";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const expenseId = form.get("expenseId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isAcceptedReceiptType(file)) {
      return NextResponse.json({ error: "Unsupported receipt type" }, { status: 400 });
    }

    let linkedExpenseId: string | undefined;
    if (expenseId) {
      const expense = await prisma.expense.findFirst({
        where: { id: expenseId, userId: session.user.id },
      });
      if (!expense) {
        return NextResponse.json({ error: "Expense not found" }, { status: 404 });
      }
      linkedExpenseId = expense.id;
    }

    const [buffer, stored] = await Promise.all([
      file.arrayBuffer().then((value) => Buffer.from(value)),
      storeReceiptFile(file, session.user.id),
    ]);
    const ocrResult = await processReceipt(buffer, file.type || "application/octet-stream");

    const parsedDate = ocrResult.data.date ? new Date(ocrResult.data.date) : null;
    const warnings = await checkDuplicates({
      amount: ocrResult.data.amount ?? 0,
      date: parsedDate ?? new Date(),
      merchant: ocrResult.data.merchant || "",
      userId: session.user.id,
      filename: file.name,
      extractedText: ocrResult.rawText,
    });

    const receipt = await prisma.receipt.create({
      data: {
        originalName: file.name,
        filePath: stored.url,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        extractedText: ocrResult.rawText,
        parsedDate,
        parsedMerchant: ocrResult.data.merchant || "",
        parsedAmount: ocrResult.data.amount,
        parsedCurrency: ocrResult.data.currency || "",
        parsedPaymentMethod: ocrResult.data.paymentMethod || "",
        suggestedCategory: ocrResult.data.suggestedCategory || "",
        confidenceScore: ocrResult.confidence,
        userId: session.user.id,
        expenseId: linkedExpenseId,
      },
    });

    return NextResponse.json({ receipt, ocrResult, warnings, storage: stored.provider }, { status: 201 });
  } catch (error) {
    console.error("Receipt upload error:", error);
    return NextResponse.json({ error: "Failed to upload receipt" }, { status: 500 });
  }
}
