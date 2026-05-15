"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { REPORT_STATUSES, MONTHS } from "@/types";
import { toast } from "sonner";
import { Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AdminReportsList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
      const res = await fetch(`/api/admin/reports?${params}`);
      const json = await res.json();
      setReports(json);
      setLoading(false);
    }
    if (status === "authenticated" && isAdmin) load();
  }, [status, isAdmin, statusFilter, search]);

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

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by worker name..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]">
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
                          {MONTHS[report.month - 1]} {report.year}
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
