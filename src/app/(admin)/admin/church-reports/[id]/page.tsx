"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CHURCH_REPORT_STATUSES, MONTHS } from "@/types";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, Eye } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/client";
import { t } from "@/lib/i18n/client";
import { Separator } from "@/components/ui/separator";

interface TitheDetail {
  id: string;
  type: string;
  donorName: string;
  amount: number;
  date: string | null;
  notes: string;
}

interface Attachment {
  id: string;
  originalName: string;
  filePath: string;
  section: string;
  fileSize: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface ChurchReport {
  id: string;
  churchId: string;
  month: number;
  year: number;
  status: string;
  totalTithe: number;
  totalSpecialOfferings: number;
  totalIncome: number;
  fundIncome: number;
  fundExpenses: number;
  fundBalance: number;
  distributionGC: number;
  distributionMENA: number;
  distributionWAF: number;
  distributionLocal: number;
  distributionOther: number;
  distributionTotal: number;
  bankBalance: number;
  priorMonthBalance: number;
  totalDeposits: number;
  expectedBalance: number;
  variance: number;
  reconciliationNotes: string;
  adminNotes: string;
  submissionDate: string | null;
  approvalDate: string | null;
  church: { id: string; name: string; code: string; city: string };
  titheOfferingDetails: TitheDetail[];
  attachments: Attachment[];
  submittedBy: User | null;
  approvedBy: User | null;
}

export default function AdminChurchReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [report, setReport] = useState<ChurchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");
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
        const res = await fetch(`/api/admin/church-reports/${id}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const json = await res.json();
        setReport(json);
        setAdminNotes(json.adminNotes || "");
      } catch {
        toast.error("Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    if (status === "authenticated" && isAdmin) load();
  }, [id, status, isAdmin]);

  async function handleAction(newStatus: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/church-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminNotes }),
      });
      if (!res.ok) throw new Error();
      toast.success(t(lang, "church.admin.reportUpdated", { status: newStatus.toLowerCase() }));
      router.refresh();
    } catch {
      toast.error(t(lang, "church.admin.updateFailed"));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">{t(lang, "common.loading")}</div>;
  if (!report) return <div>{t(lang, "common.notFound")}</div>;

  const statusConfig = CHURCH_REPORT_STATUSES.find((s) => s.value === report.status)!;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/church-reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {report.church.name} - {MONTHS[report.month - 1]} {report.year}
              </h1>
              <Badge className={statusConfig.color}>{t(lang, statusConfig.labelKey)}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {report.church.code} • {report.church.city}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t(lang, "church.admin.totalTithe")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.totalTithe.toFixed(2)} TRY</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t(lang, "church.admin.totalOfferings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.totalSpecialOfferings.toFixed(2)} TRY</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{report.totalIncome.toFixed(2)} TRY</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t(lang, "church.admin.submittedBy")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{report.submittedBy?.name || "—"}</p>
            <p className="text-xs text-muted-foreground">{report.submittedBy?.email || ""}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income & Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>Total Tithe</dt><dd className="font-medium">{report.totalTithe.toFixed(2)} TRY</dd></div>
              <div className="flex justify-between"><dt>Total Special Offerings</dt><dd className="font-medium">{report.totalSpecialOfferings.toFixed(2)} TRY</dd></div>
              <Separator className="my-2" />
              <div className="flex justify-between"><dt>Total Income</dt><dd className="font-semibold text-green-600">{report.totalIncome.toFixed(2)} TRY</dd></div>
              <Separator className="my-2" />
              <div className="flex justify-between"><dt>Fund Income</dt><dd className="font-medium">{report.fundIncome.toFixed(2)} TRY</dd></div>
              <div className="flex justify-between"><dt>Fund Expenses</dt><dd className="font-medium">{report.fundExpenses.toFixed(2)} TRY</dd></div>
              <div className="flex justify-between"><dt>Fund Balance</dt><dd className="font-medium">{report.fundBalance.toFixed(2)} TRY</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>GC</dt><dd className="font-medium">{report.distributionGC.toFixed(2)} TRY</dd></div>
              <div className="flex justify-between"><dt>MENA</dt><dd className="font-medium">{report.distributionMENA.toFixed(2)} TRY</dd></div>
              <div className="flex justify-between"><dt>WAF</dt><dd className="font-medium">{report.distributionWAF.toFixed(2)} TRY</dd></div>
              <div className="flex justify-between"><dt>Local</dt><dd className="font-medium">{report.distributionLocal.toFixed(2)} TRY</dd></div>
              <div className="flex justify-between"><dt>Other</dt><dd className="font-medium">{report.distributionOther.toFixed(2)} TRY</dd></div>
              <Separator className="my-2" />
              <div className="flex justify-between"><dt>Distribution Total</dt><dd className="font-semibold">{report.distributionTotal.toFixed(2)} TRY</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><dt className="text-muted-foreground">Bank Balance</dt><dd className="font-medium">{report.bankBalance.toFixed(2)} TRY</dd></div>
            <div><dt className="text-muted-foreground">Prior Month Balance</dt><dd className="font-medium">{report.priorMonthBalance.toFixed(2)} TRY</dd></div>
            <div><dt className="text-muted-foreground">Total Deposits</dt><dd className="font-medium">{report.totalDeposits.toFixed(2)} TRY</dd></div>
            <div><dt className="text-muted-foreground">Expected Balance</dt><dd className="font-medium">{report.expectedBalance.toFixed(2)} TRY</dd></div>
            <div>
              <dt className="text-muted-foreground">Variance</dt>
              <dd className={`font-medium ${Math.abs(report.variance) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                {report.variance.toFixed(2)} TRY
              </dd>
            </div>
          </dl>
          {report.reconciliationNotes && (
            <div className="mt-4 p-3 bg-muted rounded-md text-sm">
              <p className="text-muted-foreground">{report.reconciliationNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {report.titheOfferingDetails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Offering Details ({report.titheOfferingDetails.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.titheOfferingDetails.map((detail) => (
                <div key={detail.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{detail.donorName}</span>
                      <Badge variant="outline" className="text-xs">
                        {detail.type === "TITHE" ? "Tithe" : "Special Offering"}
                      </Badge>
                    </div>
                    {detail.notes && <p className="text-sm text-muted-foreground mt-1">{detail.notes}</p>}
                    {detail.date && <p className="text-xs text-muted-foreground mt-1">{new Date(detail.date).toLocaleDateString()}</p>}
                  </div>
                  <p className="font-semibold">{detail.amount.toFixed(2)} TRY</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {report.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attachments ({report.attachments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{att.originalName}</span>
                    <Badge variant="outline" className="text-xs">{att.section}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(att.fileSize / 1024).toFixed(0)} KB
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t(lang, "admin.adminActions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminNotes">{t(lang, "admin.adminComments")}</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={t(lang, "admin.addComments")}
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={() => handleAction("UNDER_REVIEW")}
              disabled={actionLoading || report.status !== "SUBMITTED"}
            >
              <Eye className="mr-2 h-4 w-4" />
              {t(lang, "church.admin.markReviewed")}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAction("APPROVED")}
              disabled={actionLoading || (report.status !== "UNDER_REVIEW" && report.status !== "SUBMITTED")}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t(lang, "church.admin.approve")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("REJECTED")}
              disabled={actionLoading || report.status === "REJECTED"}
            >
              <XCircle className="mr-2 h-4 w-4" />
              {t(lang, "church.admin.reject")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
