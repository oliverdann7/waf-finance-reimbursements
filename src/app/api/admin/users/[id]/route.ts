import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      city: true,
      department: true,
      title: true,
      defaultCurrency: true,
      monthlyLimit: true,
      receiptLimit: true,
      createdAt: true,
      churchId: true,
      church: { select: { id: true, name: true, code: true } },
      _count: { select: { reports: true, expenses: true, receipts: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentRole = session.user.role;
  if (currentRole !== "ADMIN" && currentRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const allowedFields: Record<string, unknown> = {};
  if (body.role !== undefined) allowedFields.role = body.role;
  if (body.churchId !== undefined) allowedFields.churchId = body.churchId || null;
  if (body.city !== undefined) allowedFields.city = body.city;
  if (body.department !== undefined) allowedFields.department = body.department;
  if (body.title !== undefined) allowedFields.title = body.title;
  if (body.monthlyLimit !== undefined) allowedFields.monthlyLimit = body.monthlyLimit;
  if (body.receiptLimit !== undefined) allowedFields.receiptLimit = body.receiptLimit;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Prevent non-SUPER_ADMIN from editing other SUPER_ADMINs
  if (currentRole !== "SUPER_ADMIN") {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Cannot modify a super admin" }, { status: 403 });
    }
    if (allowedFields.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Cannot promote to super admin" }, { status: 403 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: allowedFields,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      city: true,
      department: true,
      title: true,
      monthlyLimit: true,
      receiptLimit: true,
      churchId: true,
      church: { select: { id: true, name: true, code: true } },
    },
  });

  return NextResponse.json(updated);
}
