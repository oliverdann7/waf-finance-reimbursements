import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      city: true,
      department: true,
      title: true,
      defaultCurrency: true,
      monthlyLimit: true,
      receiptLimit: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, city, department, title, defaultCurrency } = await req.json();

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, city, department, title, defaultCurrency },
    select: {
      id: true,
      name: true,
      email: true,
      city: true,
      department: true,
      title: true,
      defaultCurrency: true,
    },
  });

  return NextResponse.json(updated);
}
