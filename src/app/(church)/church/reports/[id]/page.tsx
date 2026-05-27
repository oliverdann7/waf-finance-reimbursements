"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, startTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CHURCH_REPORT_STATUSES, MONTHS } from "@/types";
import { useLanguage, t } from "@/lib/i18n/client";
import { toast } from "sonner";
import { ArrowLeft, FileText, Edit, Download } from "lucide-react";
import Link from "next/link";

interface DetailItem {
  id: string;
  type: string;
  donorName: string;
  amount: number;
  date: string;
  notes: string;
}

interface AttachmentItem {
  id: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  section: string;
  uploadDate: string;
}

interface ReportFull {
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
  church: { name: string; code: string };
  titheOfferingDetails: DetailItem[];
  attachments: AttachmentItem[];
}

export default function ChurchReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status: authStatus } = useSession();
  const router = useRouter();
  const { lang } = useLanguage();
  const [report, setReport] = useState<ReportFull | null>(null);
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
        const res = await fetch(`/api/church-reports/${id}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error();
        const json = await res.json();
        setReport(json);
      } catch {
        toast.error(t(lang, "reports.failedLoad"));
      } finally {
        setLoading(false);
      }
    }
    if (authStatus === "authenticated") load();
  }, [id, authStatus, lang]);

  if (sessionTimedOut) {
    return <div className="animate-pulse text-muted-foreground">{t(lang, "common.sessionTimeout") || "Session timed out. Please try refreshing."}</div>;
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">{t(lang, "common.loading")}</div>;
  if (!report) return <div>{t(lang, "common.notFound")}</div>;

  const statusConfig = CHURCH_REPORT_STATUSES.find((s) => s.value === report.status);
  const isDraft = report.status === "DRAFT";
  const varianceSignificant = Math.abs(report.variance) > 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/church/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {MONTHS[report.month - 1]} {report.year}
              </h1>
              {statusConfig && (
                <Badge className={statusConfig.color}>{t(lang, statusConfig.labelKey)}</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{report.church.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <Button asChild>
              <Link href={`/church/reports/new?id=${report.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                {t(lang, "common.edit")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t(lang, "church.totalTithe")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.totalTithe.toFixed(2)} TRY</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t(lang, "church.totalSpecialOfferings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.totalSpecialOfferings.toFixed(2)} TRY</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t(lang, "church.totalIncome")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.totalIncome.toFixed(2)} TRY</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t(lang, "church.fundBalance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.fundBalance.toFixed(2)} TRY</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t(lang, "church.stepTithe")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.totalTithe")}</span><span className="font-medium">{report.totalTithe.toFixed(2)} TRY</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.totalSpecialOfferings")}</span><span className="font-medium">{report.totalSpecialOfferings.toFixed(2)} TRY</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.totalIncome")}</span><span className="font-semibold">{report.totalIncome.toFixed(2)} TRY</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.fundIncome")}</span><span className="font-medium">{report.fundIncome.toFixed(2)} TRY</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.fundExpenses")}</span><span className="font-medium">{report.fundExpenses.toFixed(2)} TRY</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.fundBalance")}</span><span className="font-semibold">{report.fundBalance.toFixed(2)} TRY</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(lang, "church.stepDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.gc")}</span><span className="font-medium">{report.distributionGC.toFixed(2)} TRY</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.mena")}</span><span className="font-medium">{report.distributionMENA.toFixed(2)} TRY</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.waf")}</span><span className="font-medium">{report.distributionWAF.toFixed(2)} TRY</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.local")}</span><span className="font-medium">{report.distributionLocal.toFixed(2)} TRY</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.other")}</span><span className="font-medium">{report.distributionOther.toFixed(2)} TRY</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">{t(lang, "church.distributionTotal")}</span><span className="font-semibold">{report.distributionTotal.toFixed(2)} TRY</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(lang, "church.stepStatement")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t(lang, "church.bankBalance")}</p>
              <p className="font-medium mt-1">{report.bankBalance.toFixed(2)} TRY</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t(lang, "church.priorMonthBalance")}</p>
              <p className="font-medium mt-1">{report.priorMonthBalance.toFixed(2)} TRY</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t(lang, "church.totalDeposits")}</p>
              <p className="font-medium mt-1">{report.totalDeposits.toFixed(2)} TRY</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t(lang, "church.expectedBalance")}</p>
              <p className="font-medium mt-1">{report.expectedBalance.toFixed(2)} TRY</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t(lang, "church.variance")}</p>
              <p className={`font-medium mt-1 ${varianceSignificant ? "text-red-600" : "text-green-600"}`}>
                {report.variance.toFixed(2)} TRY
              </p>
            </div>
          </div>
          {report.reconciliationNotes && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{t(lang, "church.reconciliationNotes")}</p>
              <p className="text-sm mt-1">{report.reconciliationNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t(lang, "church.stepDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          {report.titheOfferingDetails.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t(lang, "reports.noExpenses")}</p>
          ) : (
            <div className="space-y-3">
              {report.titheOfferingDetails.map((detail) => (
                <div key={detail.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{detail.donorName}</span>
                        <Badge variant="outline" className="text-xs">
                          {detail.type === "TITHE" ? t(lang, "church.typeTithe") : t(lang, "church.typeSpecialOffering")}
                        </Badge>
                      </div>
                      {detail.notes && (
                        <p className="text-sm text-muted-foreground">{detail.notes}</p>
                      )}
                      {detail.date && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(detail.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold">{detail.amount.toFixed(2)} TRY</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(lang, "church.attachments")}</CardTitle>
        </CardHeader>
        <CardContent>
          {report.attachments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t(lang, "church.uploadAttachment")}</p>
          ) : (
            <div className="space-y-2">
              {report.attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{att.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {att.section} &middot; {(att.fileSize / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={att.filePath} target="_blank">
                      <Download className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {report.adminNotes && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-800">
              <strong>{t(lang, "admin.adminComments")}:</strong> {report.adminNotes}
            </p>
          </CardContent>
        </Card>
      )}

      {(report.submissionDate || report.approvalDate) && (
        <Card>
          <CardHeader>
            <CardTitle>{t(lang, "reports.timeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.submissionDate && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>{t(lang, "reports.submittedTimeline")}: {new Date(report.submissionDate).toLocaleString()}</span>
                </div>
              )}
              {report.approvalDate && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{t(lang, "reports.approvedTimeline")}: {new Date(report.approvalDate).toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
