import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
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

  if (report.status !== "DRAFT") {
    return NextResponse.json({ error: "Can only edit draft reports" }, { status: 400 });
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
    const body = await req.json();
    const { type, donorName, amount, date, notes } = body;

    if (!type || !donorName || amount === undefined) {
      return NextResponse.json({ error: "Type, donorName, and amount are required" }, { status: 400 });
    }

    const detail = await prisma.titheOfferingDetail.create({
      data: {
        reportId: id,
        type,
        donorName,
        amount: Number(amount),
        date: date ? new Date(date) : null,
        notes: notes || "",
      },
    });

    return NextResponse.json(detail, { status: 201 });
  } catch (error) {
    console.error("Create detail error:", error);
    return NextResponse.json({ error: "Failed to create detail" }, { status: 500 });
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const details = await prisma.titheOfferingDetail.findMany({
    where: { reportId: id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(details);
}
