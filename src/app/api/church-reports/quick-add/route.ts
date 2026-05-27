import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { processReceipt } from "@/lib/ocr";
import { isAcceptedReceiptType, storeReceiptFile } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TITHE_TYPES = new Set(["TITHE", "GENERAL_OFFERING", "SPECIAL_OFFERING", "DESIGNATED_OFFERING"]);

function isTithe(type: string) {
  return type === "TITHE";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { churchId: true, role: true },
  });

  if (!sessionUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isChurchUser =
    sessionUser.role === "CHURCH_TREASURER" ||
    sessionUser.role === "CHURCH_PASTOR" ||
    sessionUser.role === "CHURCH_USER";

  if (!isChurchUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!sessionUser.churchId) {
    return NextResponse.json({ error: "No church assigned" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const overrideType = ((form.get("type") as string) || "").toUpperCase();
    const overrideAmount = form.get("amount") as string | null;
    const overrideDate = form.get("date") as string | null;
    const donorName = ((form.get("donorName") as string) || "").trim();
    const notes = ((form.get("notes") as string) || "").trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!isAcceptedReceiptType(file)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File over 5 MB" }, { status: 400 });
    }

    const [buffer, stored] = await Promise.all([
      file.arrayBuffer().then((b) => Buffer.from(b)),
      storeReceiptFile(file, session.user.id),
    ]);

    const ocrResult = await processReceipt(buffer, file.type || "application/octet-stream");

    const finalAmount = overrideAmount
      ? parseFloat(overrideAmount)
      : ocrResult.data.amount ?? 0;

    const parsedDateStr = overrideDate || ocrResult.data.date;
    const parsedDate = parsedDateStr ? new Date(parsedDateStr) : new Date();
    const targetMonth = parsedDate.getMonth() + 1;
    const targetYear = parsedDate.getFullYear();

    const suggestedFromOcr = (ocrResult.data.suggestedCategory ?? "").toUpperCase();
    const finalType = TITHE_TYPES.has(overrideType)
      ? overrideType
      : TITHE_TYPES.has(suggestedFromOcr)
        ? suggestedFromOcr
        : "GENERAL_OFFERING";

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      return NextResponse.json(
        { error: "Could not determine amount — please enter it manually." },
        { status: 422 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const churchId = sessionUser.churchId as string;

      const report = await tx.churchMonthlyFinancialReport.upsert({
        where: {
          churchId_month_year: { churchId, month: targetMonth, year: targetYear },
        },
        create: {
          churchId,
          month: targetMonth,
          year: targetYear,
          status: "DRAFT",
        },
        update: {},
      });

      const detail = await tx.titheOfferingDetail.create({
        data: {
          reportId: report.id,
          type: finalType,
          donorName: donorName || "—",
          amount: finalAmount,
          date: parsedDate,
          notes,
        },
      });

      const attachment = await tx.churchReportAttachment.create({
        data: {
          reportId: report.id,
          originalName: file.name,
          filePath: stored.url,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          section: "tithe",
        },
      });

      const titheField = isTithe(finalType) ? "totalTithe" : "totalSpecialOfferings";
      const updated = await tx.churchMonthlyFinancialReport.update({
        where: { id: report.id },
        data: {
          [titheField]: { increment: finalAmount },
          totalIncome: { increment: finalAmount },
        },
        select: {
          id: true,
          month: true,
          year: true,
          status: true,
          totalTithe: true,
          totalSpecialOfferings: true,
          totalIncome: true,
        },
      });

      return { report: updated, detail, attachment };
    });

    return NextResponse.json(
      {
        ...result,
        ocr: {
          confidence: ocrResult.confidence,
          suggestedType: finalType,
          parsedDate: parsedDateStr,
          parsedAmount: ocrResult.data.amount,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Quick-add error:", error);
    return NextResponse.json({ error: "Failed to record offering" }, { status: 500 });
  }
}
