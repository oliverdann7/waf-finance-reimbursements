import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import { DEFAULT_RULES } from "../src/lib/rules/defaults";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Seeding database...");

  const passwordHash = await hash("password123", 12);

  await prisma.user.upsert({
    where: { email: "admin@waf.org" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@waf.org",
      passwordHash,
      role: "SUPER_ADMIN",
      city: "Istanbul",
      department: "Finance",
      title: "Finance Director",
    },
  });

  await prisma.user.upsert({
    where: { email: "treasurer@waf.org" },
    update: {},
    create: {
      name: "Local Treasurer",
      email: "treasurer@waf.org",
      passwordHash,
      role: "TREASURER",
      city: "Ankara",
      department: "Finance",
      title: "Treasurer",
    },
  });

  const workerData = [
    { name: "Ahmet Yılmaz", email: "ahmet@waf.org", city: "Istanbul", department: "Education" },
    { name: "Ayşe Demir", email: "ayse@waf.org", city: "Ankara", department: "Health" },
    { name: "Mehmet Kaya", email: "mehmet@waf.org", city: "Izmir", department: "Agriculture" },
    { name: "Fatma Şahin", email: "fatma@waf.org", city: "Bursa", department: "Education" },
    { name: "Ali Öztürk", email: "ali@waf.org", city: "Antalya", department: "Tourism" },
  ];

  const workers = await Promise.all(
    workerData.map((w) =>
      prisma.user.upsert({
        where: { email: w.email },
        update: {},
        create: { ...w, passwordHash, role: "WORKER", title: "Field Worker" },
      })
    )
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  for (const worker of workers) {
    for (let i = 0; i < 3; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m <= 0) { m += 12; y -= 1; }

      const existing = await prisma.report.findUnique({
        where: { userId_month_year: { userId: worker.id, month: m, year: y } },
      });
      if (existing) continue;

      const statuses = ["PAID", "APPROVED", "SUBMITTED"] as const;
      const status = statuses[i] || "DRAFT";

      const report = await prisma.report.create({
        data: {
          month: m, year: y, userId: worker.id, status,
          submissionDate: new Date(y, m - 1, 15),
          approvalDate: status !== "SUBMITTED" ? new Date(y, m - 1, 20) : null,
          paymentDate: status === "PAID" ? new Date(y, m - 1, 28) : null,
        },
      });

      const categories = ["TAXI", "MILEAGE", "PHONE", "INTERNET", "BOOKS", "HOSPITALITY"];
      const merchants = ["Migros", "Turkcell", "Turkish Telecom", "Shell", "Taxi Istanbul", "D&R", "BIM", "Sok"];
      let totalRequested = 0;
      let totalReimbursable = 0;

      for (let j = 0; j < 4; j++) {
        const amount = Math.round((50 + Math.random() * 500) * 100) / 100;
        const reimbursable = amount * (Math.random() > 0.3 ? 1 : 0.5);
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];

        const expense = await prisma.expense.create({
          data: {
            date: new Date(y, m - 1, 1 + j * 7),
            merchant,
            description: `Expense for ${cat.toLowerCase().replace("_", " ")}`,
            category: cat, amount, currency: "TRY",
            exchangeRate: 1, amountInTRY: amount, reimbursableAmount: reimbursable,
            status: status !== "SUBMITTED" ? "APPROVED" : "PENDING",
            userId: worker.id, reportId: report.id,
          },
        });

        totalRequested += amount;
        totalReimbursable += reimbursable;

        if (j % 2 === 0) {
          await prisma.receipt.create({
            data: {
              originalName: `receipt-${merchant.toLowerCase().replace(/\s/g, "-")}-${j}.pdf`,
              filePath: `/uploads/mock/${worker.id}/${report.id}/${expense.id}/receipt.pdf`,
              fileType: "application/pdf", fileSize: 102400 + Math.random() * 500000,
              extractedText: `Mock receipt from ${merchant}\nAmount: ${amount} TRY`,
              parsedDate: new Date(y, m - 1, 1 + j * 7),
              parsedMerchant: merchant, parsedAmount: amount, parsedCurrency: "TRY",
              confidenceScore: 0.75 + Math.random() * 0.2,
              userId: worker.id, expenseId: expense.id,
            },
          });
        }
      }

      await prisma.report.update({
        where: { id: report.id },
        data: { totalRequested, totalReimbursable },
      });
    }
  }

  const existingRules = await prisma.reimbursementRule.count();
  if (existingRules === 0) {
    await prisma.reimbursementRule.createMany({
      data: DEFAULT_RULES,

    });
  }

  console.log("Seeding complete!");
  console.log(`\nDemo accounts (password: password123):`);
  console.log("  admin@waf.org (Super Admin)");
  console.log("  treasurer@waf.org (Treasurer)");
  console.log("  ahmet@waf.org, ayse@waf.org, mehmet@waf.org (Workers)");
  console.log("  fatma@waf.org, ali@waf.org (Workers)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
