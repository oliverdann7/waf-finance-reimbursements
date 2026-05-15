import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkDuplicates } from "@/lib/rules";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const receipt = await prisma.receipt.findFirst({
    where: { id, userId: session.user.id },
    include: { expense: true },
  });

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const warnings = await checkDuplicates({
    amount: receipt.parsedAmount ?? 0,
    date: receipt.parsedDate ?? receipt.uploadDate,
    merchant: receipt.parsedMerchant,
    userId: session.user.id,
    filename: receipt.originalName,
    extractedText: receipt.extractedText,
  });

  return NextResponse.json({ receipt, warnings });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const receipt = await prisma.receipt.findFirst({ where: { id, userId: session.user.id } });
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const updated = await prisma.receipt.update({
    where: { id },
    data: {
      parsedDate: body.parsedDate ? new Date(body.parsedDate) : receipt.parsedDate,
      parsedMerchant: body.parsedMerchant ?? receipt.parsedMerchant,
      parsedAmount: body.parsedAmount === "" || body.parsedAmount === null ? null : Number(body.parsedAmount ?? receipt.parsedAmount),
      parsedCurrency: body.parsedCurrency ?? receipt.parsedCurrency,
      parsedPaymentMethod: body.parsedPaymentMethod ?? receipt.parsedPaymentMethod,
      suggestedCategory: body.suggestedCategory ?? receipt.suggestedCategory,
      confidenceScore: body.confidenceScore === undefined ? receipt.confidenceScore : Number(body.confidenceScore),
    },
  });

  return NextResponse.json(updated);
}
