"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EXPENSE_CATEGORIES, REPORT_STATUSES, MONTHS } from "@/types";
import { Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AdminReportsList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<Array<{
    id: string;
    month: number;
    year: number;
    status: string;
    totalReimbursable: number;
    submissionDate?: string;
    expenseCount: number;
    missingReceiptCount: number;
    highRiskWarnings: number;
    user: { name: string; email: string; city: string };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [month, setMonth] = useState("");
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");

  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) router.push("/dashboard");
    if (status === "unauthenticated") router.push("/login");
  }, [status, isAdmin, router]);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      if (city) params.set("city", city);
      if (month) params.set("month", month);
      if (category && category !== "all") params.set("category", category);
      const res = await fetch(`/api/admin/reports?${params}`);
      const json = await res.json();
      setReports(json);
      setLoading(false);
    }
    if (status === "authenticated" && isAdmin) load();
  }, [status, isAdmin, statusFilter, search, city, month, category]);

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Reports</h1>
          <p className="text-muted-foreground mt-1">Review and manage all expense reports</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.9fr]">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by worker name..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <Select value={month || "all"} onValueChange={(v) => setMonth(!v || v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {MONTHS.map((label, index) => (
              <SelectItem key={label} value={String(index + 1)}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category || "all"} onValueChange={(v) => setCategory(!v || v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {REPORT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No reports found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const statusConfig = REPORT_STATUSES.find((s) => s.value === report.status)!;
            return (
              <Link key={report.id} href={`/admin/reports/${report.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{report.user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {MONTHS[report.month - 1]} {report.year} • {report.user.city || "No city"}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {report.totalReimbursable.toFixed(2)} TRY
                        </span>
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {report.expenseCount} expense(s)
                      {report.submissionDate && ` • Submitted ${new Date(report.submissionDate).toLocaleDateString()}`}
                      {report.missingReceiptCount > 0 && ` • ${report.missingReceiptCount} missing receipt(s)`}
                      {report.highRiskWarnings > 0 && (
                        <Badge variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-amber-700">High-risk warnings</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense>
      <AdminReportsList />
    </Suspense>
  );
}
