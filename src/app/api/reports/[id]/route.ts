import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request, ctx: RouteContext<"/api/reports/[id]">) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      expenses: {
        include: { receipts: true },
        orderBy: { date: "desc" },
      },
      user: { select: { name: true, email: true } },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isOwner = report.userId === session.user.id;
  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ...report,
    expenses: report.expenses.map((e) => ({
      ...e,
      hasReceipts: e.receipts.length > 0,
    })),
  });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/reports/[id]">) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { status } = await req.json();

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: any = { status };
  if (status === "SUBMITTED") updateData.submissionDate = new Date();
  if (status === "APPROVED") updateData.approvalDate = new Date();
  if (status === "PAID") updateData.paymentDate = new Date();

  const updated = await prisma.report.update({ where: { id }, data: updateData });

  return NextResponse.json(updated);
}
