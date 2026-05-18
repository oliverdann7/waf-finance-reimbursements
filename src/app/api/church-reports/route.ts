import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "TREASURER"];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = ADMIN_ROLES.includes(role);

  const sessionUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { churchId: true, role: true },
  });

  if (!sessionUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const churchRole = sessionUser.role === "CHURCH_TREASURER" || sessionUser.role === "CHURCH_PASTOR" || sessionUser.role === "CHURCH_USER";
  if (!churchRole && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const where: Prisma.ChurchMonthlyFinancialReportWhereInput = {};

  if (isAdmin) {
    if (sessionUser.churchId) {
      where.churchId = sessionUser.churchId;
    }
  } else if (sessionUser.churchId) {
    where.churchId = sessionUser.churchId;
  } else {
    return NextResponse.json({ error: "No church assigned" }, { status: 403 });
  }

  if (status) where.status = status as Prisma.EnumChurchReportStatusFilter["equals"];
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);

  const reports = await prisma.churchMonthlyFinancialReport.findMany({
    where,
    include: {
      church: { select: { name: true, code: true } },
      _count: { select: { titheOfferingDetails: true, attachments: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(
    reports.map((r) => ({
      id: r.id,
      churchId: r.churchId,
      churchName: r.church.name,
      churchCode: r.church.code,
      month: r.month,
      year: r.year,
      status: r.status,
      totalTithe: r.totalTithe,
      totalSpecialOfferings: r.totalSpecialOfferings,
      totalIncome: r.totalIncome,
      submissionDate: r.submissionDate,
      approvalDate: r.approvalDate,
      detailCount: r._count.titheOfferingDetails,
      attachmentCount: r._count.attachments,
    }))
  );
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

  const isChurchUser = sessionUser.role === "CHURCH_TREASURER" || sessionUser.role === "CHURCH_PASTOR" || sessionUser.role === "CHURCH_USER";
  const isAdmin = ADMIN_ROLES.includes(session.user.role);

  if (!isChurchUser && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!sessionUser.churchId) {
    return NextResponse.json({ error: "No church assigned" }, { status: 403 });
  }

  try {
    const { month, year } = await req.json();

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    const existing = await prisma.churchMonthlyFinancialReport.findUnique({
      where: { churchId_month_year: { churchId: sessionUser.churchId, month, year } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A report for this church, month, and year already exists" },
        { status: 409 }
      );
    }

    const report = await prisma.churchMonthlyFinancialReport.create({
      data: {
        churchId: sessionUser.churchId,
        month,
        year,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Create church report error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
