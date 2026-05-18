import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const churches = await prisma.church.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(churches);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { name, code, city, district, address, phone, email, isActive } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const existing = await prisma.church.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "A church with this code already exists" }, { status: 409 });
    }

    const church = await prisma.church.create({
      data: {
        name,
        code,
        city: city || "",
        district: district || "",
        address: address || "",
        phone: phone || "",
        email: email || "",
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(church, { status: 201 });
  } catch (error) {
    console.error("Create church error:", error);
    return NextResponse.json({ error: "Failed to create church" }, { status: 500 });
  }
}
