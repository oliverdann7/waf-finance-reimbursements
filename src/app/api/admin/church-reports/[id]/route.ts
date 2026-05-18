import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await prisma.churchMonthlyFinancialReport.findUnique({
    where: { id },
    include: {
      church: { select: { id: true, name: true, code: true, city: true, district: true } },
      titheOfferingDetails: { orderBy: { date: "asc" } },
      attachments: { orderBy: { uploadDate: "desc" } },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  let submittedBy = null;
  if (report.submittedById) {
    submittedBy = await prisma.user.findUnique({
      where: { id: report.submittedById },
      select: { id: true, name: true, email: true },
    });
  }

  let approvedBy = null;
  if (report.approvedById) {
    approvedBy = await prisma.user.findUnique({
      where: { id: report.approvedById },
      select: { id: true, name: true, email: true },
    });
  }

  return NextResponse.json({ ...report, submittedBy, approvedBy });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { status, adminNotes } = await req.json();

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    if (status === "APPROVED") {
      data.approvalDate = new Date();
      data.approvedById = session.user.id;
    }

    const report = await prisma.churchMonthlyFinancialReport.update({
      where: { id },
      data,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Update church report error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
