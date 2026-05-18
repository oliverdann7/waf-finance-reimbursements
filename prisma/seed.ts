import "dotenv/config";
import { PrismaClient, Role } from "../src/generated/prisma/client";
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

  const ankaraChurch = await prisma.church.upsert({
    where: { code: "ANKARA-GRACE" },
    update: {},
    create: {
      name: "Ankara Grace Church",
      code: "ANKARA-GRACE",
      city: "Ankara",
      district: "Çankaya",
      address: "123 Main Street, Çankaya",
      phone: "+90-312-555-0100",
      email: "ankara.grace@waf.org",
      isActive: true,
    },
  });

  const istanbulChurch = await prisma.church.upsert({
    where: { code: "IST-LIGHT" },
    update: {},
    create: {
      name: "Istanbul Light Church",
      code: "IST-LIGHT",
      city: "Istanbul",
      district: "Kadıköy",
      address: "456 Bağdat Avenue, Kadıköy",
      phone: "+90-216-555-0200",
      email: "istanbul.light@waf.org",
      isActive: true,
    },
  });

  const churchUsers = [
    {
      name: "Ankara Treasurer",
      email: "ankara.treasurer@waf.org",
      role: "CHURCH_TREASURER",
      churchId: ankaraChurch.id,
      city: "Ankara",
    },
    {
      name: "Ankara Pastor",
      email: "ankara.pastor@waf.org",
      role: "CHURCH_PASTOR",
      churchId: ankaraChurch.id,
      city: "Ankara",
    },
    {
      name: "Istanbul Treasurer",
      email: "istanbul.treasurer@waf.org",
      role: "CHURCH_TREASURER",
      churchId: istanbulChurch.id,
      city: "Istanbul",
    },
  ];

  for (const cu of churchUsers) {
    await prisma.user.upsert({
      where: { email: cu.email },
      update: { churchId: cu.churchId, role: cu.role as Role },
      create: {
        name: cu.name,
        email: cu.email,
        passwordHash,
        role: cu.role as Role,
        city: cu.city,
        department: "Church",
        title: cu.role.replace("_", " "),
        churchId: cu.churchId,
      },
    });
  }

  const distConfigs = [
    { key: "distributionGC", name: "GC", description: "General Conference", percentage: 20, active: true },
    { key: "distributionMENA", name: "MENA", description: "Middle East & North Africa", percentage: 5, active: true },
    { key: "distributionWAF", name: "WAF", description: "West Africa Field", percentage: 15, active: true },
    { key: "distributionLocal", name: "Local", description: "Local Church", percentage: 55, active: true },
    { key: "distributionOther", name: "Other", description: "Other Distribution", percentage: 5, active: true },
  ];

  for (const dc of distConfigs) {
    await prisma.churchDistributionConfig.upsert({
      where: { key: dc.key },
      update: { percentage: dc.percentage, active: dc.active },
      create: dc,
    });
  }

  for (const church of [ankaraChurch, istanbulChurch]) {
    const existingChurchReport = await prisma.churchMonthlyFinancialReport.findUnique({
      where: { churchId_month_year: { churchId: church.id, month: currentMonth, year: currentYear } },
    });

    if (!existingChurchReport) {
      const totalTithe = 15000 + Math.random() * 5000;
      const totalSpecialOfferings = 5000 + Math.random() * 3000;
      const totalIncome = totalTithe + totalSpecialOfferings;
      const distributionGC = totalIncome * 0.2;
      const distributionMENA = totalIncome * 0.05;
      const distributionWAF = totalIncome * 0.15;
      const distributionLocal = totalIncome * 0.55;
      const distributionOther = totalIncome * 0.05;

      const report = await prisma.churchMonthlyFinancialReport.create({
        data: {
          churchId: church.id,
          month: currentMonth,
          year: currentYear,
          status: "SUBMITTED",
          totalTithe: Math.round(totalTithe * 100) / 100,
          totalSpecialOfferings: Math.round(totalSpecialOfferings * 100) / 100,
          totalIncome: Math.round(totalIncome * 100) / 100,
          fundIncome: Math.round(totalIncome * 0.1 * 100) / 100,
          fundExpenses: Math.round(totalIncome * 0.03 * 100) / 100,
          fundBalance: Math.round(totalIncome * 0.07 * 100) / 100,
          distributionGC: Math.round(distributionGC * 100) / 100,
          distributionMENA: Math.round(distributionMENA * 100) / 100,
          distributionWAF: Math.round(distributionWAF * 100) / 100,
          distributionLocal: Math.round(distributionLocal * 100) / 100,
          distributionOther: Math.round(distributionOther * 100) / 100,
          distributionTotal: Math.round(totalIncome * 100) / 100,
          bankBalance: Math.round((totalIncome + 2000) * 100) / 100,
          priorMonthBalance: 2000,
          totalDeposits: Math.round(totalIncome * 100) / 100,
          expectedBalance: Math.round((totalIncome + 2000) * 100) / 100,
          variance: 0,
          reconciliationNotes: "",
          adminNotes: "",
          submissionDate: new Date(currentYear, currentMonth - 1, 28),
        },
      });

      const donorNames = ["John Smith", "Mary Johnson", "David Brown", "Sarah Wilson", "Michael Lee"];
      const titheAmount = totalTithe / 3;

      for (let i = 0; i < 3; i++) {
        await prisma.titheOfferingDetail.create({
          data: {
            reportId: report.id,
            type: "TITHE",
            donorName: donorNames[i],
            amount: Math.round(titheAmount * 100) / 100,
            date: new Date(currentYear, currentMonth - 1, 10 + i * 5),
            notes: `Weekly tithe from ${donorNames[i]}`,
          },
        });
      }

      const offeringAmount = totalSpecialOfferings / 2;
      for (let i = 0; i < 2; i++) {
        await prisma.titheOfferingDetail.create({
          data: {
            reportId: report.id,
            type: "SPECIAL_OFFERING",
            donorName: donorNames[i + 3],
            amount: Math.round(offeringAmount * 100) / 100,
            date: new Date(currentYear, currentMonth - 1, 15 + i * 7),
            notes: `Special offering for ${i === 0 ? "building fund" : "missions"}`,
          },
        });
      }
    }
  }

  console.log("Seeding complete!");
  console.log(`\nDemo accounts (password: password123):`);
  console.log("  admin@waf.org (Super Admin)");
  console.log("  treasurer@waf.org (Treasurer)");
  console.log("  ahmet@waf.org, ayse@waf.org, mehmet@waf.org (Workers)");
  console.log("  fatma@waf.org, ali@waf.org (Workers)");
  console.log("  ankara.treasurer@waf.org (Church Treasurer - Ankara Grace)");
  console.log("  ankara.pastor@waf.org (Church Pastor - Ankara Grace)");
  console.log("  istanbul.treasurer@waf.org (Church Treasurer - Istanbul Light)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
