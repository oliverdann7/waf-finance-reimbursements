import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const receipts = await prisma.receipt.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadDate: "desc" },
  });

  return NextResponse.json(receipts);
}
