"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { REPORT_STATUSES, MONTHS } from "@/types";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, DollarSign } from "lucide-react";
import Link from "next/link";

type AdminExpense = {
  id: string;
  date: string;
  merchant: string;
  description: string;
  category: string;
  amountInTRY: number;
  status: string;
  receipts?: Array<{ id: string }>;
};

type AdminReport = {
  id: string;
  month: number;
  year: number;
  status: string;
  totalRequested: number;
  totalReimbursable: number;
  adminComments?: string;
  user?: { name: string; email: string };
  expenses?: AdminExpense[];
};

export default function AdminReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
    if (status === "unauthenticated") router.push("/login");
  }, [status, isAdmin, router]);

  useEffect(() => {
    async function load() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(`/api/admin/reports/${id}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const json = await res.json();
        setReport(json);
        setComment(json.adminComments || "");
      } catch {
        toast.error("Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    if (status === "authenticated" && isAdmin) load();
  }, [id, status, isAdmin]);

  async function loadReport() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/admin/reports/${id}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const json = await res.json();
      setReport(json);
      setComment(json.adminComments || "");
    } catch {
      toast.error("Failed to load report");
    }
  }

  async function handleAction(newStatus: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminComments: comment }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Report ${newStatus.toLowerCase()}!`);
      await loadReport();
    } catch {
      toast.error("Failed to update report");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleExpenseAction(expenseId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/admin/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Expense ${newStatus.toLowerCase()}!`);
      await loadReport();
    } catch {
      toast.error("Failed to update expense");
    }
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading report...</div>;
  if (!report) return <div>Report not found</div>;

  const statusConfig = REPORT_STATUSES.find((s) => s.value === report.status)!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {report.user?.name} - {MONTHS[report.month - 1]} {report.year}
              </h1>
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{report.user?.email}</p>
          </div>
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
            <p className="text-2xl font-bold">{report.expenses?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comment">Admin Comments</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add comments about this report..."
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={() => handleAction("UNDER_REVIEW")}
              disabled={actionLoading || report.status !== "SUBMITTED"}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Start Review
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAction("APPROVED")}
              disabled={actionLoading || (report.status !== "UNDER_REVIEW" && report.status !== "SUBMITTED")}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("REJECTED")}
              disabled={actionLoading || report.status === "PAID" || report.status === "REJECTED"}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleAction("PAID")}
              disabled={actionLoading || report.status !== "APPROVED"}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Mark as Paid
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {report.expenses?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No expenses in this report</p>
          ) : (
            <div className="space-y-3">
              {report.expenses?.map((expense) => (
                <div key={expense.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{expense.merchant}</span>
                        <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                        <Badge
                          className={
                            expense.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : expense.status === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {expense.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{expense.amountInTRY.toFixed(2)} TRY</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200"
                      onClick={() => handleExpenseAction(expense.id, "APPROVED")}
                      disabled={expense.status !== "PENDING"}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200"
                      onClick={() => handleExpenseAction(expense.id, "REJECTED")}
                      disabled={expense.status !== "PENDING"}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
