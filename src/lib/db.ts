import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// We want to use LibSql adapter ONLY locally if SQLite is used.
// If DATABASE_URL is postgres, we do NOT use LibSql adapter.
const isSqlite = (process.env.DATABASE_URL || "file:./dev.db").startsWith("file:");

const prismaClientSingleton = () => {
  if (isSqlite) {
    const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

