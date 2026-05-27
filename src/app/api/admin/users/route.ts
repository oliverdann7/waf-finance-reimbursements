import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (roleFilter) where.role = roleFilter;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
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
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
