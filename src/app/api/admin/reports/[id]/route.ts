import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      expenses: { include: { receipts: true }, orderBy: { date: "desc" } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const { status, adminComments } = await req.json();

  const updateData: Prisma.ReportUpdateInput = { status };
  if (adminComments !== undefined) updateData.adminComments = adminComments;
  if (status === "APPROVED") updateData.approvalDate = new Date();
  if (status === "PAID") updateData.paymentDate = new Date();

  const updated = await prisma.report.update({ where: { id }, data: updateData });

  return NextResponse.json(updated);
}
