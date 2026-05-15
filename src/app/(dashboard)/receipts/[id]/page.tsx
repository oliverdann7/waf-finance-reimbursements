"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EXPENSE_CATEGORIES, MONTHS } from "@/types";

type ReceiptDetail = {
  id: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  parsedDate: string | null;
  parsedMerchant: string;
  parsedAmount: number | null;
  parsedCurrency: string;
  parsedPaymentMethod: string;
  suggestedCategory: string;
  confidenceScore: number;
  expenseId: string | null;
};

type ReportOption = {
  id: string;
  month: number;
  year: number;
  status: string;
};

type Warning = { message: string; severity: "warning" | "error" };

export default function ReceiptReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [reports, setReports] = useState<ReportOption[]>([]);
  const [reportId, setReportId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [receiptRes, reportsRes] = await Promise.all([
      fetch(`/api/receipts/${id}`),
      fetch("/api/reports"),
    ]);
    if (!receiptRes.ok) {
      toast.error("Receipt not found");
      router.push("/receipts");
      return;
    }
    const receiptJson = await receiptRes.json();
    const reportsJson = await reportsRes.json();
    setReceipt(receiptJson.receipt);
    setWarnings(receiptJson.warnings || []);
    const draftReports = Array.isArray(reportsJson)
      ? reportsJson.filter((report: ReportOption) => report.status === "DRAFT")
      : [];
    setReports(draftReports);
    setReportId(draftReports[0]?.id || "");
  }, [id, router]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") void Promise.resolve().then(load);
  }, [status, router, load]);

  const parsedDate = receipt?.parsedDate
    ? new Date(receipt.parsedDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!receipt) return;

    setSaving(true);
    const form = new FormData(e.currentTarget);
    const data = {
      parsedDate: form.get("date") as string,
      parsedMerchant: form.get("merchant") as string,
      parsedAmount: Number(form.get("amount")),
      parsedCurrency: form.get("currency") as string,
      parsedPaymentMethod: form.get("paymentMethod") as string,
      suggestedCategory: form.get("category") as string,
    };

    try {
      const res = await fetch(`/api/receipts/${receipt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("save failed");
      const updated = await res.json();
      setReceipt(updated);
      toast.success("Receipt review saved");
    } catch {
      toast.error("Could not save receipt review");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!receipt || !reportId) return;

    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      date: form.get("date") as string,
      merchant: form.get("merchant") as string,
      description: `Created from receipt ${receipt.originalName}`,
      category: form.get("category") as string,
      amount: Number(form.get("amount")),
      currency: form.get("currency") as string,
      exchangeRate: Number(form.get("exchangeRate") || 1),
      reportId,
      receiptId: receipt.id,
    };

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "create failed");
      toast.success("Expense created from receipt");
      router.push(`/reports/${json.reportId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create expense");
    } finally {
      setSaving(false);
    }
  }

  if (!receipt) {
    return <div className="animate-pulse text-muted-foreground">Loading receipt review...</div>;
  }

  const formId = "receipt-review-form";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/receipts"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Review Receipt</h1>
            <p className="text-muted-foreground mt-1">Confirm OCR fields before creating an expense</p>
          </div>
        </div>
        <Badge variant="outline">{Math.round(receipt.confidenceScore * 100)}% OCR confidence</Badge>
      </div>

      {warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="space-y-2 py-4">
            {warnings.map((warning) => (
              <div key={warning.message} className="flex gap-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>{warning.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Parsed receipt fields</CardTitle>
            <CardDescription>Edit the mock OCR result if anything looks wrong.</CardDescription>
          </CardHeader>
          <CardContent>
            <form id={formId} onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={parsedDate} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant</Label>
                <Input id="merchant" name="merchant" defaultValue={receipt.parsedMerchant} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" name="amount" type="number" step="0.01" defaultValue={receipt.parsedAmount ?? 0} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" name="currency" defaultValue={receipt.parsedCurrency || "TRY"} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment method</Label>
                <Input id="paymentMethod" name="paymentMethod" defaultValue={receipt.parsedPaymentMethod} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Suggested category</Label>
                <Select name="category" defaultValue={receipt.suggestedCategory || "OTHER"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>{category.icon} {category.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> Save review
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipt file</CardTitle>
            <CardDescription>{receipt.originalName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" asChild className="w-full">
              <a href={receipt.filePath} target="_blank" rel="noreferrer">
                <FileText className="mr-2 h-4 w-4" /> Open uploaded file
              </a>
            </Button>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p>Type: {receipt.fileType || "unknown"}</p>
              <p>Size: {(receipt.fileSize / 1024).toFixed(1)} KB</p>
              <p>Linked expense: {receipt.expenseId ? "yes" : "not yet"}</p>
            </div>
            <Textarea readOnly rows={9} value={receipt.extractedText} className="text-xs" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create an expense from this receipt</CardTitle>
          <CardDescription>Choose a draft report after confirming the parsed receipt fields.</CardDescription>
        </CardHeader>
        <CardContent>
          {receipt.expenseId ? (
            <p className="text-sm text-muted-foreground">This receipt is already linked to an expense.</p>
          ) : reports.length === 0 ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">Create a draft report before converting receipts into expenses.</p>
              <Button asChild><Link href="/reports/new">Create report</Link></Button>
            </div>
          ) : (
            <form onSubmit={handleCreateExpense} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <input type="hidden" name="date" value={parsedDate} />
              <input type="hidden" name="merchant" value={receipt.parsedMerchant} />
              <input type="hidden" name="amount" value={receipt.parsedAmount ?? 0} />
              <input type="hidden" name="currency" value={receipt.parsedCurrency || "TRY"} />
              <input type="hidden" name="category" value={receipt.suggestedCategory || "OTHER"} />
              <input type="hidden" name="exchangeRate" value="1" />
              <div className="space-y-2">
                <Label>Draft report</Label>
                <Select value={reportId} onValueChange={(value) => value && setReportId(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {reports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>{MONTHS[report.month - 1]} {report.year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={saving || !reportId}>Create expense</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
