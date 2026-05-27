"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, startTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REPORT_STATUSES, MONTHS } from "@/types";
import { toast } from "sonner";
import { ArrowLeft, FileDown, PlusCircle, Receipt } from "lucide-react";
import Link from "next/link";

interface ExpenseItem {
  id: string;
  date: string;
  merchant: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  amountInTRY: number;
  reimbursableAmount: number;
  status: string;
  hasReceipts: boolean;
}

interface ReportDetail {
  id: string;
  month: number;
  year: number;
  status: string;
  totalRequested: number;
  totalReimbursable: number;
  adminComments: string;
  submissionDate: string | null;
  approvalDate: string | null;
  paymentDate: string | null;
  expenses: ExpenseItem[];
  user: { name: string; email: string };
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);

  useEffect(() => {
    if (authStatus === "loading") {
      const timer = setTimeout(() => setSessionTimedOut(true), 10000);
      return () => clearTimeout(timer);
    }
    startTransition(() => setSessionTimedOut(false));
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    async function load() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`/api/reports/${id}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const json = await res.json();
        setReport(json);
      } catch {
        toast.error("Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    if (authStatus === "authenticated") load();
  }, [id, authStatus]);

  async function handleSubmit() {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUBMITTED" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Report submitted for review!");
      router.refresh();
    } catch {
      toast.error("Failed to submit report");
    }
  }

  async function handleDelete(expenseId: string) {
    try {
      const res = await fetch(`/api/expenses?id=${expenseId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Expense deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete expense");
    }
  }

  if (sessionTimedOut) {
    return <div className="animate-pulse text-muted-foreground">Session timed out. Please try refreshing the page.</div>;
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading report...</div>;
  if (!report) return <div>Report not found</div>;

  const statusConfig = REPORT_STATUSES.find((s) => s.value === report.status)!;
  const isOwner = report.user.email === session?.user?.email;
  const isDraft = report.status === "DRAFT";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {MONTHS[report.month - 1]} {report.year}
              </h1>
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{report.user.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isDraft && isOwner && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/expenses/new?reportId=${report.id}`}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Expense
                </Link>
              </Button>
              <Button onClick={handleSubmit}>Submit Report</Button>
            </>
          )}
          {isOwner && (
            <Button variant="outline" asChild>
              <Link href={`/api/export?reportId=${report.id}`}>
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Requested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.totalRequested.toFixed(2)} TRY</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Reimbursable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{report.totalReimbursable.toFixed(2)} TRY</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.expenses.length}</p>
          </CardContent>
        </Card>
      </div>

      {report.adminComments && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-800">
              <strong>Admin Comments:</strong> {report.adminComments}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expenses</CardTitle>
          {isDraft && isOwner && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/expenses/new?reportId=${report.id}`}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {report.expenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No expenses yet.{isDraft && isOwner ? " Add your first expense." : ""}
            </p>
          ) : (
            <div className="space-y-3">
              {report.expenses.map((expense) => (
                <div key={expense.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{expense.merchant}</span>
                        <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                        {expense.hasReceipts ? (
                          <Receipt className="h-3 w-3 text-green-500" />
                        ) : (
                          <Receipt className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-semibold">{expense.amountInTRY.toFixed(2)} TRY</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.amount} {expense.currency}
                      </p>
                      <p className="text-xs text-green-600">
                        Reimbursable: {expense.reimbursableAmount.toFixed(2)} TRY
                      </p>
                    </div>
                  </div>
                  {isDraft && (
                    <div className="mt-2 flex gap-2">
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(expense.id)}>
                        Delete
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/receipts?expenseId=${expense.id}`}>
                          <Receipt className="mr-1 h-3 w-3" />
                          Receipt
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {report.submissionDate && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Submitted: {new Date(report.submissionDate).toLocaleString()}</span>
              </div>
              {report.approvalDate && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Approved: {new Date(report.approvalDate).toLocaleString()}</span>
                </div>
              )}
              {report.paymentDate && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Paid: {new Date(report.paymentDate).toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
