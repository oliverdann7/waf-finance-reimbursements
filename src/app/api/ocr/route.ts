import { processReceipt } from "@/lib/ocr";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processReceipt(buffer, file.type);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
}
