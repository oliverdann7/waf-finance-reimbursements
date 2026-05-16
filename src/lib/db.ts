import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  if (process.env.NODE_ENV === "production") {
    // Production: Use standard Prisma Client for Vercel Postgres
    return new PrismaClient({});
  }

  // Development: Use LibSQL adapter for local SQLite
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
