"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, startTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { PlusCircle, FileText, AlertCircle, CheckCircle2, Clock, DollarSign, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  currentReport: {
    id: string;
    month: number;
    year: number;
    status: string;
    totalRequested: number;
    totalReimbursable: number;
    expenseCount: number;
  } | null;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  paidCount: number;
  missingReceipts: number;
  monthlyTotals: { month: number; year: number; total: number }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "loading") {
      const timer = setTimeout(() => setSessionTimedOut(true), 10000);
      return () => clearTimeout(timer);
    }
    startTransition(() => setSessionTimedOut(false));
  }, [status]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/dashboard", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        setFetchError(true);
        toast.error("Failed to load dashboard data");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setFetchError(true);
      if (err instanceof Error && err.name === "AbortError") {
        toast.error("Dashboard request timed out. Database may be unavailable.");
      } else {
        toast.error("Failed to load dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") startTransition(() => { loadDashboardData(); });
  }, [status, loadDashboardData]);

  if (sessionTimedOut) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-muted-foreground">Session loading timed out. Database may be unavailable.</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>
    );
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-muted-foreground">Could not load dashboard. The server may be starting up or the database is unavailable.</p>
        <Button onClick={loadDashboardData}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const statusIcons: Record<string, React.ReactNode> = {
    DRAFT: <FileText className="h-5 w-5 text-gray-500" />,
    SUBMITTED: <Clock className="h-5 w-5 text-blue-500" />,
    UNDER_REVIEW: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    APPROVED: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    REJECTED: <AlertCircle className="h-5 w-5 text-red-500" />,
    PAID: <DollarSign className="h-5 w-5 text-emerald-500" />,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session?.user?.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/reports/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Report
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/expenses/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Draft Reports", value: data?.draftCount ?? 0, icon: FileText, color: "text-gray-600" },
          { label: "Submitted", value: data?.submittedCount ?? 0, icon: Clock, color: "text-blue-600" },
          { label: "Approved", value: data?.approvedCount ?? 0, icon: CheckCircle2, color: "text-green-600" },
          { label: "Paid", value: data?.paidCount ?? 0, icon: DollarSign, color: "text-emerald-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.missingReceipts && data.missingReceipts > 0 ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              You have <strong>{data.missingReceipts}</strong> expense(s) without receipts.
            </p>
            <Button variant="outline" size="sm" asChild><Link href="/receipts" className="ml-auto">Upload Receipts</Link></Button>
          </CardContent>
        </Card>
      ) : null}

      {data?.currentReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {statusIcons[data.currentReport.status]}
              Current Month Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="text-lg font-semibold">
                  {new Date(data.currentReport.year, data.currentReport.month - 1).toLocaleString("default", { month: "long" })} {data.currentReport.year}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requested</p>
                <p className="text-lg font-semibold">{data.currentReport.totalRequested.toFixed(2)} TRY</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reimbursable</p>
                <p className="text-lg font-semibold text-green-600">{data.currentReport.totalReimbursable.toFixed(2)} TRY</p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={65} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {data.currentReport.expenseCount} expense(s) logged
              </p>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/reports/${data.currentReport.id}`}>View Report</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {data?.monthlyTotals && data.monthlyTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Monthly Totals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {data.monthlyTotals.slice(-6).map((mt) => (
                <div key={`${mt.month}-${mt.year}`} className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    {new Date(mt.year, mt.month - 1).toLocaleString("default", { month: "short" })} {mt.year}
                  </p>
                  <p className="text-lg font-semibold mt-1">{mt.total.toFixed(2)} TRY</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
