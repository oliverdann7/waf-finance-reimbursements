"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { REPORT_STATUSES, MONTHS } from "@/types";
import { toast } from "sonner";
import { FileText, Users, DollarSign, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface AdminStats {
  totalReports: number;
  pendingReports: number;
  totalUsers: number;
  totalPaid: number;
  recentReports: { id: string; month: number; year: number; status: string; user: { name: string }; totalReimbursable: number }[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/stats");
        const json = await res.json();
        setStats(json);
      } catch {
        toast.error("Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    }
    if (status === "authenticated") load();
  }, [status]);

  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  if (status === "authenticated" && !isAdmin) {
    router.push("/dashboard");
    return null;
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading admin dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage reimbursements and system configuration</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Reports", value: stats?.totalReports ?? 0, icon: FileText, color: "text-blue-600" },
          { label: "Pending Review", value: stats?.pendingReports ?? 0, icon: Clock, color: "text-yellow-600" },
          { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-purple-600" },
          { label: "Total Paid", value: `${(stats?.totalPaid ?? 0).toFixed(0)} TRY`, icon: DollarSign, color: "text-green-600" },
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/admin/reports">
                <FileText className="mr-2 h-4 w-4" />
                Review Submitted Reports
              </Link>
            </Button>
            {stats && stats.pendingReports > 0 && (
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href={`/admin/reports?status=SUBMITTED`}>
                  <Clock className="mr-2 h-4 w-4" />
                  Pending Approvals ({stats.pendingReports})
                </Link>
              </Button>
            )}
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/admin/rules">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Configure Reimbursement Rules
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentReports && stats.recentReports.length > 0 ? (
              <div className="space-y-3">
                {stats.recentReports.slice(0, 5).map((report) => {
                  const statusConfig = REPORT_STATUSES.find((s) => s.value === report.status)!;
                  return (
                    <Link key={report.id} href={`/admin/reports/${report.id}`}>
                      <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 hover:bg-gray-50 rounded p-2 -mx-2 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{report.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {MONTHS[report.month - 1]} {report.year}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {report.totalReimbursable.toFixed(2)} TRY
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No reports yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
