import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const report = await prisma.churchMonthlyFinancialReport.findUnique({
    where: { id },
    include: {
      church: { select: { name: true, code: true } },
      titheOfferingDetails: { orderBy: { date: "desc" } },
      attachments: { orderBy: { uploadDate: "desc" } },
    },
  });

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

  const isAdmin = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN" || sessionUser.role === "TREASURER";
  const isChurchUser = sessionUser.role === "CHURCH_TREASURER" || sessionUser.role === "CHURCH_PASTOR" || sessionUser.role === "CHURCH_USER";
  const isOwner = sessionUser.churchId === report.churchId;

  if (!isAdmin && !(isChurchUser && isOwner)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(report);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  if (report.status !== "DRAFT" && !isAdmin) {
    return NextResponse.json({ error: "Can only edit draft reports" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const allowedFields = [
      "totalTithe", "totalSpecialOfferings", "totalIncome",
      "fundIncome", "fundExpenses", "fundBalance",
      "distributionGC", "distributionMENA", "distributionWAF",
      "distributionLocal", "distributionOther", "distributionTotal",
      "bankBalance", "priorMonthBalance", "totalDeposits",
      "expectedBalance", "variance", "reconciliationNotes",
    ];

    const updateData: Prisma.ChurchMonthlyFinancialReportUpdateInput = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updateData as Record<string, unknown>)[field] = body[field];
      }
    }

    const updated = await prisma.churchMonthlyFinancialReport.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update church report error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
