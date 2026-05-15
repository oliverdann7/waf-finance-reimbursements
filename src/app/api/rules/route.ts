import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DEFAULT_RULES } from "@/lib/rules/defaults";
import type { Prisma } from "@/generated/prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rules = await prisma.reimbursementRule.findMany({ orderBy: { key: "asc" } });

  if (rules.length === 0) {
    await prisma.reimbursementRule.createMany({ data: DEFAULT_RULES });
    rules = await prisma.reimbursementRule.findMany({ orderBy: { key: "asc" } });
  }

  return NextResponse.json(rules);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, value, active } = await req.json();
  const data: Prisma.ReimbursementRuleUpdateInput = {};
  if (value !== undefined) data.value = value;
  if (active !== undefined) data.active = active;

  await prisma.reimbursementRule.update({ where: { id }, data });

  return NextResponse.json({ success: true });
}
