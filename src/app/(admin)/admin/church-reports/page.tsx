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
import { Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/client";
import { t } from "@/lib/i18n/client";

interface ChurchReport {
  id: string;
  churchId: string;
  month: number;
  year: number;
  status: string;
  totalTithe: number;
  totalSpecialOfferings: number;
  totalIncome: number;
  submissionDate?: string;
  church: { id: string; name: string; code: string; city: string };
  titheOfferingDetails: { id: string; type: string; amount: number }[];
}

export default function AdminChurchReportsPage() {
  const { lang } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<ChurchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

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
      if (month) params.set("month", month);
      if (year) params.set("year", year);
      const res = await fetch(`/api/admin/church-reports?${params}`);
      const json = await res.json();
      setReports(json);
      setLoading(false);
    }
    if (status === "authenticated" && isAdmin) load();
  }, [status, isAdmin, statusFilter, search, month, year]);

  if (loading) return <div className="animate-pulse text-muted-foreground">{t(lang, "common.loading")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(lang, "church.admin.allReports")}</h1>
          <p className="text-muted-foreground mt-1">{t(lang, "church.admin.allReportsDesc")}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t(lang, "admin.searchWorker")}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger>
            <SelectValue placeholder={t(lang, "admin.filter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CHURCH_REPORT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{t(lang, s.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={(v) => setMonth(!v || v === "all" ? "" : v)}>
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
        <Input
          placeholder="Year"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t(lang, "church.admin.noReports")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const statusConfig = CHURCH_REPORT_STATUSES.find((s) => s.value === report.status)!;
            return (
              <Link key={report.id} href={`/admin/church-reports/${report.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{report.church.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {MONTHS[report.month - 1]} {report.year} • {report.church.city || "—"}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="text-sm">
                          <p className="font-medium">{report.totalIncome.toFixed(2)} TRY</p>
                          <p className="text-muted-foreground text-xs">
                            Tithe: {report.totalTithe.toFixed(0)} | Offerings: {report.totalSpecialOfferings.toFixed(0)}
                          </p>
                        </div>
                        <Badge className={statusConfig.color}>{t(lang, statusConfig.labelKey)}</Badge>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {report.titheOfferingDetails.length} offering detail(s)
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
