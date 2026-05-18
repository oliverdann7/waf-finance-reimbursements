import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

let databaseWarningShown = false;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || "";
  if (!url) {
    if (typeof window === "undefined" && !databaseWarningShown) {
      databaseWarningShown = true;
      console.warn(
        "WARN: DATABASE_URL is not set. Configure it in your environment variables.\n" +
          "  Local: set DATABASE_URL in .env or .env.local\n" +
          "  Vercel: add DATABASE_URL in Project Settings → Environment Variables"
      );
    }
    return url;
  }
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    if (!databaseWarningShown) {
      databaseWarningShown = true;
      console.warn(
        `WARN: DATABASE_URL should be a PostgreSQL connection string starting with "postgresql://". ` +
          `Current value starts with "${url.slice(0, 20)}..."`
      );
    }
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl || undefined });
  const adapter = new PrismaPg(pool);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
