import { prisma } from "@/lib/db";
import { DEFAULT_RULES } from "./defaults";
import type { ReimbursementRule, RuleEvaluation } from "./types";
import type { ValidationWarning } from "@/types";

export async function getRules(): Promise<ReimbursementRule[]> {
  const count = await prisma.reimbursementRule.count();
  if (count === 0) {
    await prisma.reimbursementRule.createMany({
      data: DEFAULT_RULES,
    });
  }
  return prisma.reimbursementRule.findMany({
    orderBy: { key: "asc" },
  }) as Promise<ReimbursementRule[]>;
}

export async function getRuleValue(key: string): Promise<number> {
  const rule = await prisma.reimbursementRule.findUnique({ where: { key } });
  return rule?.value ?? 0;
}

export async function evaluateExpenseRules(params: {
  category: string;
  amount: number;
  amountInTRY: number;
  date: Date;
  hasReceipt: boolean;
  userId: string;
  reportId: string;
}): Promise<{ evaluations: RuleEvaluation[]; warnings: ValidationWarning[] }> {
  const rules = await getRules();
  const evaluations: RuleEvaluation[] = [];
  const warnings: ValidationWarning[] = [];

  const ruleMap = new Map(rules.map((r) => [r.key, r]));

  const mileageRate = ruleMap.get("mileage_rate");
  const commCap = ruleMap.get("communication_cap");
  const hospCap = ruleMap.get("hospitality_cap");
  const utilPct = ruleMap.get("utilities_percentage");
  const receiptMin = ruleMap.get("receipt_min_amount");
  const ageLimit = ruleMap.get("expense_age_limit");
  const maxAmount = ruleMap.get("max_expense_amount");
  const rentCap = ruleMap.get("rent_cap");

  if (maxAmount?.active && params.amountInTRY > maxAmount.value) {
    evaluations.push({
      ruleKey: "max_expense_amount",
      ruleName: "Maximum Single Expense Amount",
      passed: false,
      message: `Expense amount (${params.amountInTRY} TRY) exceeds maximum single expense cap of ${maxAmount.value} TRY`,
      severity: "error",
    });
    warnings.push({
      type: "cap_exceeded",
      message: `Amount exceeds maximum single expense cap of ${maxAmount.value} TRY`,
      severity: "error",
    });
  }

  if (receiptMin?.active && params.amountInTRY > receiptMin.value && !params.hasReceipt) {
    evaluations.push({
      ruleKey: "receipt_min_amount",
      ruleName: "Receipt Required",
      passed: false,
      message: `Receipt required for expenses over ${receiptMin.value} TRY`,
      severity: "warning",
    });
    warnings.push({
      type: "missing_receipt",
      message: `Receipt required for expenses over ${receiptMin.value} TRY`,
      severity: "warning",
    });
  }

  if (ageLimit?.active) {
    const daysOld = Math.floor(
      (Date.now() - new Date(params.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysOld > ageLimit.value) {
      evaluations.push({
        ruleKey: "expense_age_limit",
        ruleName: "Expense Age Limit",
        passed: false,
        message: `Expense is ${daysOld} days old, exceeds limit of ${ageLimit.value} days`,
        severity: "warning",
      });
      warnings.push({
        type: "old_expense",
        message: `Expense is ${daysOld} days old (max ${ageLimit.value} days)`,
        severity: "warning",
      });
    }
  }

  if (params.category === "MILEAGE" && mileageRate?.active) {
    const km = params.amount;
    const calculated = km * mileageRate.value;
    evaluations.push({
      ruleKey: "mileage_rate",
      ruleName: "Mileage Rate",
      passed: true,
      message: `${km} km × ${mileageRate.value} TRY/km = ${calculated.toFixed(2)} TRY`,
      severity: "info",
    });
  }

  if ((params.category === "PHONE" || params.category === "INTERNET") && commCap?.active) {
    const existingExpenses = await prisma.expense.findMany({
      where: {
        reportId: params.reportId,
        category: { in: ["PHONE", "INTERNET"] },
      },
    });
    const totalComm = existingExpenses.reduce((s, e) => s + e.amountInTRY, 0) + params.amountInTRY;
    if (totalComm > commCap.value) {
      evaluations.push({
        ruleKey: "communication_cap",
        ruleName: "Communication Monthly Cap",
        passed: false,
        message: `Total communication expenses (${totalComm.toFixed(2)} TRY) exceed cap of ${commCap.value} TRY`,
        severity: "warning",
      });
      warnings.push({
        type: "cap_exceeded",
        message: `Communication expenses exceed monthly cap of ${commCap.value} TRY`,
        severity: "warning",
      });
    }
  }

  if (params.category === "HOSPITALITY" && hospCap?.active) {
    const existingExpenses = await prisma.expense.findMany({
      where: { reportId: params.reportId, category: "HOSPITALITY" },
    });
    const totalHosp = existingExpenses.reduce((s, e) => s + e.amountInTRY, 0) + params.amountInTRY;
    if (totalHosp > hospCap.value) {
      evaluations.push({
        ruleKey: "hospitality_cap",
        ruleName: "Hospitality Monthly Cap",
        passed: false,
        message: `Total hospitality expenses (${totalHosp.toFixed(2)} TRY) exceed cap of ${hospCap.value} TRY`,
        severity: "warning",
      });
      warnings.push({
        type: "cap_exceeded",
        message: `Hospitality expenses exceed monthly cap of ${hospCap.value} TRY`,
        severity: "warning",
      });
    }
  }

  if (params.category === "RENT" && rentCap?.active) {
    if (params.amountInTRY > rentCap.value) {
      evaluations.push({
        ruleKey: "rent_cap",
        ruleName: "Rent Assistance Cap",
        passed: false,
        message: `Rent amount (${params.amountInTRY} TRY) exceeds cap of ${rentCap.value} TRY`,
        severity: "warning",
      });
      warnings.push({
        type: "cap_exceeded",
        message: `Rent assistance exceeds cap of ${rentCap.value} TRY`,
        severity: "warning",
      });
    }
  }

  return { evaluations, warnings };
}

export async function checkDuplicates(params: {
  amount: number;
  date: Date;
  merchant: string;
  userId: string;
}): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];
  const existing = await prisma.expense.findMany({
    where: { userId: params.userId },
  });

  for (const expense of existing) {
    const sameAmount = Math.abs(expense.amount - params.amount) < 0.01;
    const sameDate =
      new Date(expense.date).toDateString() === new Date(params.date).toDateString();
    const sameMerchant =
      expense.merchant.toLowerCase().trim() === params.merchant.toLowerCase().trim();

    if ((sameAmount && sameDate) || (sameAmount && sameMerchant)) {
      warnings.push({
        type: "duplicate",
        message: `Possible duplicate: ${expense.merchant}, ${expense.amount} ${expense.currency} on ${new Date(expense.date).toLocaleDateString()}`,
        severity: "warning",
      });
    }
  }

  return warnings;
}

export { type ReimbursementRule, type RuleEvaluation } from "./types";
