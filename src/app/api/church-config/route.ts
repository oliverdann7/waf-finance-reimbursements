import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = await prisma.churchDistributionConfig.findMany({
    orderBy: { key: "asc" },
  });

  return NextResponse.json(configs);
}

export async function PUT(req: Request) {
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
    const { configs } = await req.json();

    if (!Array.isArray(configs) || configs.length === 0) {
      return NextResponse.json({ error: "Configs array is required" }, { status: 400 });
    }

    const total = configs.reduce((sum: number, c: { percentage: number }) => sum + c.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json({ error: "Percentages must total 100%" }, { status: 400 });
    }

    const results = await Promise.all(
      configs.map((c: { id: string; percentage: number; active: boolean }) =>
        prisma.churchDistributionConfig.update({
          where: { id: c.id },
          data: { percentage: c.percentage, active: c.active },
        })
      )
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Update config error:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
