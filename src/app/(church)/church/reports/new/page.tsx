"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { MONTHS } from "@/types";
import { useLanguage, t } from "@/lib/i18n/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Plus, Trash2, Upload, Check, FileText } from "lucide-react";
import Link from "next/link";

const STEPS = [
  "church",
  "tithe",
  "distribution",
  "statement",
  "details",
  "attachments",
  "review",
] as const;

const STEP_KEYS = [
  "church.stepChurch",
  "church.stepTithe",
  "church.stepDistribution",
  "church.stepStatement",
  "church.stepDetails",
  "church.stepAttachments",
  "church.stepReview",
] as const;

interface DetailEntry {
  id?: string;
  type: "TITHE" | "SPECIAL_OFFERING";
  donorName: string;
  amount: number;
  date: string;
  notes: string;
}

interface DistributionConfig {
  key: string;
  percentage: number;
}

interface FormData {
  churchId: string;
  churchName: string;
  month: number;
  year: number;
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
}

export default function NewChurchReportPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <NewChurchReportPage />
    </Suspense>
  );
}

function NewChurchReportPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { lang } = useLanguage();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [reportId, setReportId] = useState<string | null>(editId);
  const [distConfigs, setDistConfigs] = useState<DistributionConfig[]>([]);
  const distConfigsRef = useRef(distConfigs);
  useEffect(() => { distConfigsRef.current = distConfigs; }, [distConfigs]);

  const [form, setForm] = useState<FormData>({
    churchId: "",
    churchName: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    totalTithe: 0,
    totalSpecialOfferings: 0,
    totalIncome: 0,
    fundIncome: 0,
    fundExpenses: 0,
    fundBalance: 0,
    distributionGC: 0,
    distributionMENA: 0,
    distributionWAF: 0,
    distributionLocal: 0,
    distributionOther: 0,
    distributionTotal: 0,
    bankBalance: 0,
    priorMonthBalance: 0,
    totalDeposits: 0,
    expectedBalance: 0,
    variance: 0,
    reconciliationNotes: "",
  });

  const [details, setDetails] = useState<DetailEntry[]>([]);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    async function init() {
      try {
        const userRes = await fetch("/api/profile");
        if (!userRes.ok) return;
        const userData = await userRes.json();

        let churchName = "";
        if (userData.churchId) {
          const churchRes = await fetch(`/api/churches?id=${userData.churchId}`);
          if (churchRes.ok) {
            const churches = await churchRes.json();
            const found = Array.isArray(churches) ? churches.find((c: { id: string }) => c.id === userData.churchId) : null;
            if (found) churchName = found.name;
          }
        }

        setForm((prev) => ({
          ...prev,
          churchId: userData.churchId || "",
          churchName: churchName || userData.churchName || "",
        }));

        const configRes = await fetch("/api/church-config");
        if (configRes.ok) {
          const configs = await configRes.json();
          if (Array.isArray(configs) && configs.length > 0) {
            setDistConfigs(
              configs.map((c: { key: string; percentage: number }) => ({
                key: c.key,
                percentage: c.percentage,
              }))
            );
          }
        }
      } catch {
      } finally {
        setInitialLoading(false);
      }
    }
    if (authStatus === "authenticated") init();
  }, [authStatus]);

  useEffect(() => {
    async function loadReport() {
      if (!editId) return;
      try {
        const res = await fetch(`/api/church-reports/${editId}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setForm({
          churchId: data.churchId || "",
          churchName: data.church?.name || "",
          month: data.month,
          year: data.year,
          totalTithe: data.totalTithe,
          totalSpecialOfferings: data.totalSpecialOfferings,
          totalIncome: data.totalIncome,
          fundIncome: data.fundIncome,
          fundExpenses: data.fundExpenses,
          fundBalance: data.fundBalance,
          distributionGC: data.distributionGC,
          distributionMENA: data.distributionMENA,
          distributionWAF: data.distributionWAF,
          distributionLocal: data.distributionLocal,
          distributionOther: data.distributionOther,
          distributionTotal: data.distributionTotal,
          bankBalance: data.bankBalance,
          priorMonthBalance: data.priorMonthBalance,
          totalDeposits: data.totalDeposits,
          expectedBalance: data.expectedBalance,
          variance: data.variance,
          reconciliationNotes: data.reconciliationNotes,
        });
        if (data.titheOfferingDetails) {
          setDetails(
            data.titheOfferingDetails.map((d: { id: string; type: string; donorName: string; amount: number; date: string; notes: string }) => ({
              id: d.id,
              type: d.type as "TITHE" | "SPECIAL_OFFERING",
              donorName: d.donorName,
              amount: d.amount,
              date: d.date ? d.date.split("T")[0] : "",
              notes: d.notes,
            }))
          );
        }
      } catch {
        toast.error(t(lang, "common.error"));
      }
    }
    if (editId && authStatus === "authenticated") loadReport();
  }, [editId, authStatus, lang]);

  const updateForm = useCallback((key: keyof FormData, value: number | string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "totalTithe" || key === "totalSpecialOfferings") {
        next.totalIncome = Number(next.totalTithe) + Number(next.totalSpecialOfferings);
      }
      if (key === "totalIncome" || key === "totalTithe" || key === "totalSpecialOfferings") {
        const total = key === "totalIncome" ? Number(value) : next.totalIncome;
        const configs = distConfigsRef.current;
        if (configs.length === 0) {
          next.distributionGC = Math.round(total * 0.2 * 100) / 100;
          next.distributionMENA = Math.round(total * 0.05 * 100) / 100;
          next.distributionWAF = Math.round(total * 0.15 * 100) / 100;
          next.distributionLocal = Math.round(total * 0.55 * 100) / 100;
          next.distributionOther = Math.round(total * 0.05 * 100) / 100;
          next.distributionTotal = total;
        } else {
          let distTotal = 0;
          const fieldMap: Record<string, keyof FormData> = {
            distributionGC: "distributionGC",
            distributionMENA: "distributionMENA",
            distributionWAF: "distributionWAF",
            distributionLocal: "distributionLocal",
            distributionOther: "distributionOther",
          };
          for (const config of configs) {
            const field = fieldMap[config.key];
            if (field) {
              const amount = Math.round(total * (config.percentage / 100) * 100) / 100;
              (next as Record<string, number | string>)[field] = amount;
              distTotal += amount;
            }
          }
          next.distributionTotal = Math.round(distTotal * 100) / 100;
        }
      }
      if (key === "fundIncome" || key === "fundExpenses") {
        next.fundBalance = Number(next.fundIncome) - Number(next.fundExpenses);
      }
      if (key === "priorMonthBalance" || key === "totalDeposits") {
        next.expectedBalance = Number(next.priorMonthBalance) + Number(next.totalDeposits);
      }
      if (key === "expectedBalance" || key === "bankBalance" || key === "priorMonthBalance" || key === "totalDeposits") {
        next.variance = Number(next.expectedBalance) - Number(next.bankBalance);
      }
      return next;
    });
  }, []);



  async function createReport(): Promise<string | null> {
    try {
      const res = await fetch("/api/church-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: form.month, year: form.year }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t(lang, "church.failedCreate"));
        return null;
      }
      const report = await res.json();
      setReportId(report.id);
      toast.success(t(lang, "church.created"));
      return report.id;
    } catch {
      toast.error(t(lang, "church.failedCreate"));
      return null;
    }
  }

  async function saveStep(stepData: Partial<FormData>) {
    const id = reportId || (await createReport());
    if (!id) return false;

    try {
      const res = await fetch(`/api/church-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepData),
      });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      toast.error(t(lang, "common.error"));
      return false;
    }
  }

  async function handleNext() {
    setLoading(true);

    if (step === 0) {
      if (!reportId) {
        const id = await createReport();
        if (!id) {
          setLoading(false);
          return;
        }
      }
    } else if (step === 1) {
      await saveStep({
        totalTithe: form.totalTithe,
        totalSpecialOfferings: form.totalSpecialOfferings,
        totalIncome: form.totalIncome,
        fundIncome: form.fundIncome,
        fundExpenses: form.fundExpenses,
        fundBalance: form.fundBalance,
      });
    } else if (step === 2) {
      await saveStep({
        distributionGC: form.distributionGC,
        distributionMENA: form.distributionMENA,
        distributionWAF: form.distributionWAF,
        distributionLocal: form.distributionLocal,
        distributionOther: form.distributionOther,
        distributionTotal: form.distributionTotal,
      });
    } else if (step === 3) {
      await saveStep({
        bankBalance: form.bankBalance,
        priorMonthBalance: form.priorMonthBalance,
        totalDeposits: form.totalDeposits,
        expectedBalance: form.expectedBalance,
        variance: form.variance,
        reconciliationNotes: form.reconciliationNotes,
      });
    }

    setLoading(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleSubmit() {
    setLoading(true);
    const id = reportId;
    if (!id) {
      toast.error(t(lang, "common.error"));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/church-reports/${id}/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t(lang, "church.failedSubmit"));
        setLoading(false);
        return;
      }
      toast.success(t(lang, "church.submitted"));
      router.push(`/church/reports/${id}`);
    } catch {
      toast.error(t(lang, "church.failedSubmit"));
      setLoading(false);
    }
  }

  async function addDetail() {
    const id = reportId;
    if (!id) {
      toast.error(t(lang, "common.error"));
      return;
    }

    const newDetail: DetailEntry = {
      type: "TITHE",
      donorName: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      notes: "",
    };

    try {
      const res = await fetch(`/api/church-reports/${id}/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDetail),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setDetails((prev) => [...prev, { ...newDetail, id: saved.id }]);
    } catch {
      toast.error(t(lang, "common.error"));
    }
  }

  function removeDetail(index: number) {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDetail(index: number, key: keyof DetailEntry, value: string | number) {
    setDetails((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const id = reportId;
    if (!id || !e.target.files?.length) return;

    const file = e.target.files[0];
    const section = "other";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("section", section);

    try {
      const res = await fetch(`/api/church-reports/${id}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      toast.success(t(lang, "common.success"));
    } catch {
      toast.error(t(lang, "common.error"));
    }
  }

  if (initialLoading) {
    return <div className="animate-pulse text-muted-foreground">{t(lang, "common.loading")}</div>;
  }

  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const distTotal =
    form.distributionGC +
    form.distributionMENA +
    form.distributionWAF +
    form.distributionLocal +
    form.distributionOther;

  const distMismatch = Math.abs(distTotal - form.totalIncome) > 0.01;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/church/reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {editId ? t(lang, "church.myReport") : t(lang, "church.newReport")}
          </h1>
          <p className="text-muted-foreground mt-1">
            <span className="font-medium">{t(lang, STEP_KEYS[step])}</span> &mdash; Step {step + 1} of {totalSteps}
          </p>
        </div>
      </div>

      <Progress value={progress} className="h-2">
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>

      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">{t(lang, "church.stepChurch")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t(lang, "church.selectChurch")}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>{t(lang, "church.title")}</Label>
                <Input value={form.churchName} disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t(lang, "reports.month")}</Label>
                  <Select
                    value={String(form.month)}
                    onValueChange={(v) => v && updateForm("month", parseInt(v))}
                    disabled={!!editId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "reports.year")}</Label>
                  <Input
                    type="number"
                    value={form.year}
                    onChange={(e) => updateForm("year", parseInt(e.target.value) || new Date().getFullYear())}
                    min={2020}
                    max={2030}
                    disabled={!!editId}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">{t(lang, "church.stepTithe")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t(lang, "church.totalTithe")}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t(lang, "church.totalTithe")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.totalTithe}
                    onChange={(e) => updateForm("totalTithe", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.totalSpecialOfferings")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.totalSpecialOfferings}
                    onChange={(e) => updateForm("totalSpecialOfferings", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.totalIncome")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.totalIncome}
                    className="font-semibold bg-muted"
                    disabled
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t(lang, "church.fundIncome")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.fundIncome}
                    onChange={(e) => updateForm("fundIncome", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.fundExpenses")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.fundExpenses}
                    onChange={(e) => updateForm("fundExpenses", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.fundBalance")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.fundBalance}
                    className="font-semibold bg-muted"
                    disabled
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">{t(lang, "church.stepDistribution")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t(lang, "church.totalToDistribute")}: {form.totalIncome.toFixed(2)} TRY</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t(lang, "church.gc")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.distributionGC}
                    onChange={(e) =>
                      setForm((prev) => {
                        const val = parseFloat(e.target.value) || 0;
                        const total =
                          val + prev.distributionMENA + prev.distributionWAF + prev.distributionLocal + prev.distributionOther;
                        return { ...prev, distributionGC: val, distributionTotal: Math.round(total * 100) / 100 };
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.mena")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.distributionMENA}
                    onChange={(e) =>
                      setForm((prev) => {
                        const val = parseFloat(e.target.value) || 0;
                        const total =
                          prev.distributionGC + val + prev.distributionWAF + prev.distributionLocal + prev.distributionOther;
                        return { ...prev, distributionMENA: val, distributionTotal: Math.round(total * 100) / 100 };
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.waf")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.distributionWAF}
                    onChange={(e) =>
                      setForm((prev) => {
                        const val = parseFloat(e.target.value) || 0;
                        const total =
                          prev.distributionGC + prev.distributionMENA + val + prev.distributionLocal + prev.distributionOther;
                        return { ...prev, distributionWAF: val, distributionTotal: Math.round(total * 100) / 100 };
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.local")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.distributionLocal}
                    onChange={(e) =>
                      setForm((prev) => {
                        const val = parseFloat(e.target.value) || 0;
                        const total =
                          prev.distributionGC + prev.distributionMENA + prev.distributionWAF + val + prev.distributionOther;
                        return { ...prev, distributionLocal: val, distributionTotal: Math.round(total * 100) / 100 };
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.other")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.distributionOther}
                    onChange={(e) =>
                      setForm((prev) => {
                        const val = parseFloat(e.target.value) || 0;
                        const total =
                          prev.distributionGC + prev.distributionMENA + prev.distributionWAF + prev.distributionLocal + val;
                        return { ...prev, distributionOther: val, distributionTotal: Math.round(total * 100) / 100 };
                      })
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">{t(lang, "church.distributionTotal")}</span>
                <span className={`text-lg font-bold ${distMismatch ? "text-red-600" : "text-green-600"}`}>
                  {distTotal.toFixed(2)} TRY
                  {distMismatch && (
                    <span className="ml-2 text-sm font-normal text-red-600">
                      {t(lang, "church.distributionMismatch")}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">{t(lang, "church.stepStatement")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t(lang, "church.bankBalance")}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t(lang, "church.bankBalance")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.bankBalance}
                    onChange={(e) => updateForm("bankBalance", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.priorMonthBalance")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.priorMonthBalance}
                    onChange={(e) => updateForm("priorMonthBalance", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.totalDeposits")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.totalDeposits}
                    onChange={(e) => updateForm("totalDeposits", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.expectedBalance")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.expectedBalance}
                    className="font-semibold bg-muted"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, "church.variance")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.variance}
                    className={`font-semibold bg-muted ${Math.abs(form.variance) > 0.01 ? "text-red-600" : "text-green-600"}`}
                    disabled
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>{t(lang, "church.reconciliationNotes")}</Label>
                <Textarea
                  value={form.reconciliationNotes}
                  onChange={(e) => updateForm("reconciliationNotes", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{t(lang, "church.stepDetails")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{t(lang, "church.addDetail")}</p>
                </div>
                <Button onClick={addDetail} disabled={!reportId}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t(lang, "church.addDetail")}
                </Button>
              </div>
              <Separator />
              {details.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2" />
                  <p>{t(lang, "church.addDetail")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {details.map((detail, i) => (
                    <Card key={i} size="sm">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">{t(lang, "church.type")}</Label>
                            <Select
                              value={detail.type}
                              onValueChange={(v) => updateDetail(i, "type", v as "TITHE" | "SPECIAL_OFFERING")}
                            >
                              <SelectTrigger size="sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TITHE">{t(lang, "church.typeTithe")}</SelectItem>
                                <SelectItem value="SPECIAL_OFFERING">{t(lang, "church.typeSpecialOffering")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t(lang, "church.donorName")}</Label>
                            <Input
                              value={detail.donorName}
                              onChange={(e) => updateDetail(i, "donorName", e.target.value)}
                              className="h-7 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t(lang, "church.amount")}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={detail.amount}
                              onChange={(e) => updateDetail(i, "amount", parseFloat(e.target.value) || 0)}
                              className="h-7 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t(lang, "church.date")}</Label>
                            <Input
                              type="date"
                              value={detail.date}
                              onChange={(e) => updateDetail(i, "date", e.target.value)}
                              className="h-7 text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 h-7 w-7"
                              onClick={() => removeDetail(i)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">{t(lang, "church.stepAttachments")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t(lang, "church.uploadAttachment")}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4">
                <Card size="sm">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t(lang, "church.sectionBankStatement")}</p>
                        <p className="text-sm text-muted-foreground">{t(lang, "church.uploadAttachment")}</p>
                      </div>
                      <Label className="cursor-pointer">
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Upload className="h-4 w-4" />
                          {t(lang, "church.uploadAttachment")}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                          data-section="bank_statement"
                          onChange={handleFileUpload}
                          disabled={!reportId}
                        />
                      </Label>
                    </div>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t(lang, "church.sectionOfferingDetails")}</p>
                        <p className="text-sm text-muted-foreground">{t(lang, "church.uploadAttachment")}</p>
                      </div>
                      <Label className="cursor-pointer">
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Upload className="h-4 w-4" />
                          {t(lang, "church.uploadAttachment")}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                          data-section="offering_details"
                          onChange={handleFileUpload}
                          disabled={!reportId}
                        />
                      </Label>
                    </div>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t(lang, "church.sectionOther")}</p>
                        <p className="text-sm text-muted-foreground">{t(lang, "church.uploadAttachment")}</p>
                      </div>
                      <Label className="cursor-pointer">
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Upload className="h-4 w-4" />
                          {t(lang, "church.uploadAttachment")}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                          data-section="other"
                          onChange={handleFileUpload}
                          disabled={!reportId}
                        />
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">{t(lang, "church.stepReview")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t(lang, "church.reviewAndSubmit")}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t(lang, "reports.month")}</p>
                  <p className="font-medium">{MONTHS[form.month - 1]} {form.year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t(lang, "church.totalIncome")}</p>
                  <p className="font-medium">{form.totalIncome.toFixed(2)} TRY</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="font-medium mb-2">{t(lang, "church.stepTithe")}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t(lang, "church.totalTithe")}:</span>
                    <span className="ml-2 font-medium">{form.totalTithe.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t(lang, "church.totalSpecialOfferings")}:</span>
                    <span className="ml-2 font-medium">{form.totalSpecialOfferings.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t(lang, "church.fundBalance")}:</span>
                    <span className="ml-2 font-medium">{form.fundBalance.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="font-medium mb-2">{t(lang, "church.stepDistribution")}</p>
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div><span className="text-muted-foreground">{t(lang, "church.gc")}:</span><span className="ml-1 font-medium">{form.distributionGC.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">{t(lang, "church.mena")}:</span><span className="ml-1 font-medium">{form.distributionMENA.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">{t(lang, "church.waf")}:</span><span className="ml-1 font-medium">{form.distributionWAF.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">{t(lang, "church.local")}:</span><span className="ml-1 font-medium">{form.distributionLocal.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">{t(lang, "church.other")}:</span><span className="ml-1 font-medium">{form.distributionOther.toFixed(2)}</span></div>
                </div>
                {distMismatch && (
                  <p className="text-sm text-red-600 mt-2">{t(lang, "church.distributionMismatch")}</p>
                )}
              </div>
              <Separator />
              <div>
                <p className="font-medium mb-2">{t(lang, "church.stepStatement")}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">{t(lang, "church.bankBalance")}:</span><span className="ml-2 font-medium">{form.bankBalance.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">{t(lang, "church.expectedBalance")}:</span><span className="ml-2 font-medium">{form.expectedBalance.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">{t(lang, "church.variance")}:</span><span className={`ml-2 font-medium ${Math.abs(form.variance) > 0.01 ? "text-red-600" : "text-green-600"}`}>{form.variance.toFixed(2)}</span></div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="font-medium mb-2">{t(lang, "church.stepDetails")}</p>
                <p className="text-sm text-muted-foreground">{details.length} {t(lang, "reports.expenseCount", { count: details.length })}</p>
              </div>
              <Separator />
              {details.length === 0 && (
                <p className="text-sm text-amber-600">{t(lang, "reports.noExpenses")}</p>
              )}
              {distMismatch && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span className="font-medium">{t(lang, "common.error")}:</span> {t(lang, "church.distributionMismatch")}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t(lang, "common.back")}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t(lang, "common.next")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || distMismatch || details.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Check className="mr-2 h-4 w-4" />
              {t(lang, "common.submit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
