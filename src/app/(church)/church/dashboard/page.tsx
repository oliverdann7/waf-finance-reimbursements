import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslation } from "@/lib/i18n";
import { CHURCH_REPORT_STATUSES, MONTHS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FileText, PlusCircle, ArrowRight, Church, Camera, Sparkles } from "lucide-react";

export default async function ChurchDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { churchId: true },
  });

  const church = user?.churchId
    ? await prisma.church.findUnique({ where: { id: user.churchId } })
    : null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let currentReport = null;
  if (church) {
    currentReport = await prisma.churchMonthlyFinancialReport.findUnique({
      where: { churchId_month_year: { churchId: church.id, month: currentMonth, year: currentYear } },
    });
  }

  const reportsCount = church
    ? await prisma.churchMonthlyFinancialReport.count({ where: { churchId: church.id } })
    : 0;

  const statusConfig = currentReport
    ? CHURCH_REPORT_STATUSES.find((s) => s.value === currentReport.status)
    : null;

  const t = getTranslation("en");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.church.dashboard}</h1>
          <p className="text-muted-foreground mt-1">{church?.name || t.church.selectChurch}</p>
        </div>
      </div>

      {!church ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Church className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t.church.selectChurch}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/15 p-2.5 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Log this week&apos;s offering</p>
                  <p className="text-sm text-muted-foreground">
                    Snap a deposit slip or count sheet — we&apos;ll read the amount and add it to your report.
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/church/quick-add">
                  <Camera className="h-4 w-4" /> Quick Add
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t.church.totalTithe}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {currentReport ? currentReport.totalTithe.toFixed(2) : "0.00"} TRY
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t.church.totalSpecialOfferings}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {currentReport ? currentReport.totalSpecialOfferings.toFixed(2) : "0.00"} TRY
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t.church.totalIncome}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {currentReport ? currentReport.totalIncome.toFixed(2) : "0.00"} TRY
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t.church.fundBalance}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {currentReport ? currentReport.fundBalance.toFixed(2) : "0.00"} TRY
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.church.myReport}</CardTitle>
              <CardDescription>
                {MONTHS[currentMonth - 1]} {currentYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentReport ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">
                        {MONTHS[currentReport.month - 1]} {currentReport.year}
                      </span>
                      {statusConfig && (
                        <Badge className={statusConfig.color}>{t.church.status[statusConfig.value.toLowerCase() as keyof typeof t.church.status]}</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {currentReport.status === "DRAFT" && (
                        <Button asChild>
                          <Link href={`/church/reports/new?id=${currentReport.id}`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t.church.newReport}
                          </Link>
                        </Button>
                      )}
                      <Button variant="outline" asChild>
                        <Link href={`/church/reports/${currentReport.id}`}>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          {t.dashboard.viewReport}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.church.noReports}</span>
                  <Button asChild>
                    <Link href="/church/reports/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t.church.newReport}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {reportsCount > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link href="/church/reports">
                  <FileText className="mr-2 h-4 w-4" />
                  {t.church.reportsList} ({reportsCount})
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
