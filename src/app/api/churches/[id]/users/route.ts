import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { churchId: id },
    select: { id: true, name: true, email: true, role: true, title: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const { email, role: userRole } = await req.json();

    if (!email || !userRole) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    const validRoles = ["CHURCH_TREASURER", "CHURCH_PASTOR", "CHURCH_USER"];
    if (!validRoles.includes(userRole)) {
      return NextResponse.json({ error: "Invalid church role" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found with this email" }, { status: 404 });
    }

    if (user.churchId) {
      return NextResponse.json({ error: "User is already assigned to a church" }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { churchId: id, role: userRole },
      select: { id: true, name: true, email: true, role: true, title: true },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error("Add user to church error:", error);
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
  }
}
