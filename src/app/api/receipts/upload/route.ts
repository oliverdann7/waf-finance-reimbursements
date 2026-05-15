import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processReceipt } from "@/lib/ocr";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: "public",
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ocrResult = await processReceipt(buffer, file.type);

    const receipt = await prisma.receipt.create({
      data: {
        originalName: file.name,
        filePath: blob.url, // Store the blob URL
        fileType: file.type,
        fileSize: file.size,
        extractedText: ocrResult.rawText,
        parsedDate: ocrResult.data.date ? new Date(ocrResult.data.date) : null,
        parsedMerchant: ocrResult.data.merchant || "",
        parsedAmount: ocrResult.data.amount,
        parsedCurrency: ocrResult.data.currency || "",
        parsedPaymentMethod: ocrResult.data.paymentMethod || "",
        suggestedCategory: ocrResult.data.suggestedCategory || "",
        confidenceScore: ocrResult.confidence,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ receipt, ocrResult }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload receipt" }, { status: 500 });
  }
}
