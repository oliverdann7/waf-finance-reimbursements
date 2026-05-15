"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REPORT_STATUSES, MONTHS } from "@/types";
import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";

interface ReportListItem {
  id: string;
  month: number;
  year: number;
  status: string;
  totalRequested: number;
  totalReimbursable: number;
  submissionDate: string | null;
  paymentDate: string | null;
  expenseCount: number;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      setReports(json);
      setLoading(false);
    }
    if (status === "authenticated") load();
  }, [status, statusFilter, search]);

  if (status === "loading") return <div className="animate-pulse text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Reports</h1>
          <p className="text-muted-foreground mt-1">Manage your monthly expense reports</p>
        </div>
        <Button asChild>
          <Link href="/reports/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Report
          </Link>
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {REPORT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading reports...</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No reports found</p>
            <Button asChild><Link href="/reports/new">Create Your First Report</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => {
            const statusConfig = REPORT_STATUSES.find((s) => s.value === report.status)!;
            return (
              <Link key={report.id} href={`/reports/${report.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {MONTHS[report.month - 1]} {report.year}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.expenseCount} expense(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.totalRequested.toFixed(2)} TRY
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                      {report.submissionDate && (
                        <span>Submitted: {new Date(report.submissionDate).toLocaleDateString()}</span>
                      )}
                      {report.paymentDate && (
                        <span>Paid: {new Date(report.paymentDate).toLocaleDateString()}</span>
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
