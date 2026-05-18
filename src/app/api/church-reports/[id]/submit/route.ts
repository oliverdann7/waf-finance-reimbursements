import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const report = await prisma.churchMonthlyFinancialReport.findUnique({
    where: { id },
    include: {
      titheOfferingDetails: true,
      attachments: true,
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.status !== "DRAFT") {
    return NextResponse.json({ error: "Report is already submitted" }, { status: 400 });
  }

  const sessionUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { churchId: true, role: true },
  });

  if (!sessionUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const canSubmit = sessionUser.role === "CHURCH_TREASURER" || sessionUser.role === "CHURCH_PASTOR";
  if (!canSubmit || sessionUser.churchId !== report.churchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (report.titheOfferingDetails.length === 0) {
    return NextResponse.json({ error: "Add at least one tithe or offering detail before submitting" }, { status: 400 });
  }

  try {
    const updated = await prisma.churchMonthlyFinancialReport.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submissionDate: new Date(),
        submittedById: session.user.id,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Submit church report error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
