import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAcceptedReceiptType, storeReceiptFile } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const report = await prisma.churchMonthlyFinancialReport.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const sessionUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { churchId: true, role: true },
  });

  if (!sessionUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isChurchUser = sessionUser.role === "CHURCH_TREASURER" || sessionUser.role === "CHURCH_PASTOR" || sessionUser.role === "CHURCH_USER";
  const isAdmin = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN" || sessionUser.role === "TREASURER";
  const isOwner = sessionUser.churchId === report.churchId;

  if (!isAdmin && !(isChurchUser && isOwner)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const section = (form.get("section") as string) || "other";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isAcceptedReceiptType(file)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const stored = await storeReceiptFile(file, session.user.id);

    const attachment = await prisma.churchReportAttachment.create({
      data: {
        reportId: id,
        originalName: file.name,
        filePath: stored.url,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        section,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("Attachment upload error:", error);
    return NextResponse.json({ error: "Failed to upload attachment" }, { status: 500 });
  }
}
