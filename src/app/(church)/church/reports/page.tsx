"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CHURCH_REPORT_STATUSES, MONTHS } from "@/types";
import { useLanguage, t } from "@/lib/i18n/client";
import Link from "next/link";
import { PlusCircle, Search, FileText } from "lucide-react";

interface ReportListItem {
  id: string;
  churchId: string;
  churchName: string;
  churchCode: string;
  month: number;
  year: number;
  status: string;
  totalTithe: number;
  totalSpecialOfferings: number;
  totalIncome: number;
  submissionDate: string | null;
  approvalDate: string | null;
  detailCount: number;
  attachmentCount: number;
}

export default function ChurchReportsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { lang } = useLanguage();
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
      const res = await fetch(`/api/church-reports?${params}`);
      const json = await res.json();
      setReports(json);
      setLoading(false);
    }
    if (status === "authenticated") load();
  }, [status, statusFilter, search]);

  if (status === "loading") return <div className="animate-pulse text-muted-foreground">{t(lang, "common.loading")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(lang, "church.reports")}</h1>
          <p className="text-muted-foreground mt-1">{t(lang, "church.reportsList")}</p>
        </div>
        <Button asChild>
          <Link href="/church/reports/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t(lang, "church.newReport")}
          </Link>
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t(lang, "reports.search")}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t(lang, "reports.filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t(lang, "reports.allStatuses")}</SelectItem>
            {CHURCH_REPORT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{t(lang, s.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="animate-pulse text-muted-foreground">{t(lang, "common.loading")}</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">{t(lang, "church.noReports")}</p>
            <Button asChild>
              <Link href="/church/reports/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t(lang, "church.newReport")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => {
            const statusConfig = CHURCH_REPORT_STATUSES.find((s) => s.value === report.status)!;
            return (
              <Link key={report.id} href={`/church/reports/${report.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {MONTHS[report.month - 1]} {report.year}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.churchName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {report.detailCount} {t(lang, "reports.expenseCount", { count: report.detailCount })}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={statusConfig.color}>{t(lang, statusConfig.labelKey)}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.totalIncome.toFixed(2)} TRY
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                      {report.submissionDate && (
                        <span>{t(lang, "reports.submittedDate", { date: new Date(report.submissionDate).toLocaleDateString() })}</span>
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
