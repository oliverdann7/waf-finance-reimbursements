"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/types";

export interface ParsedReceipt {
  id: string;
  originalName: string;
  filePath: string;
  parsedDate: string | null;
  parsedMerchant: string;
  parsedAmount: number | null;
  parsedCurrency: string;
  parsedPaymentMethod: string;
  suggestedCategory: string;
  confidenceScore: number;
}

export interface ReceiptConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ParsedReceipt | null;
  previewUrl: string | null;
  warnings?: string[];
  reportId: string | null;
  onSaved?: () => void;
}

function confidenceBadge(score: number) {
  if (score >= 0.85) return { label: "High", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (score >= 0.5) return { label: "Medium", className: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Low — please check", className: "bg-red-50 text-red-700 border-red-200" };
}

const CURRENCIES = ["TRY", "USD", "EUR", "GBP"];

export function ReceiptConfirmSheet({
  open,
  onOpenChange,
  receipt,
  previewUrl,
  warnings = [],
  reportId,
  onSaved,
}: ReceiptConfirmSheetProps) {
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  if (receipt && receipt.id !== lastReceiptId) {
    setLastReceiptId(receipt.id);
    setDate(receipt.parsedDate ? receipt.parsedDate.slice(0, 10) : "");
    setMerchant(receipt.parsedMerchant ?? "");
    setAmount(receipt.parsedAmount != null ? String(receipt.parsedAmount) : "");
    setCurrency(receipt.parsedCurrency || "TRY");
    const validCategory = EXPENSE_CATEGORIES.find((c) => c.value === receipt.suggestedCategory);
    setCategory(validCategory?.value ?? "");
    setDescription("");
  }

  if (!receipt) return null;

  const badge = confidenceBadge(receipt.confidenceScore);

  async function saveAsExpense() {
    if (!reportId) {
      toast.error("Open or create a draft report first, then save from there.");
      return;
    }
    if (!date || !merchant || !category || !amount) {
      toast.error("Please fill date, merchant, category, and amount.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          merchant,
          description,
          category,
          amount: parseFloat(amount),
          currency,
          exchangeRate: 1,
          reportId,
          receiptId: receipt!.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to save expense");
        return;
      }
      toast.success("Expense saved");
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error("Failed to save expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <SheetTitle>Review parsed receipt</SheetTitle>
          </div>
          <SheetDescription>
            We auto-filled these fields from the photo. Edit anything that looks off, then save.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 px-4 space-y-4">
          {previewUrl && (
            <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Receipt" className="w-full max-h-56 object-contain" />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate max-w-[60%]">{receipt.originalName}</span>
            <Badge variant="outline" className={badge.className}>
              {badge.label} · {(receipt.confidenceScore * 100).toFixed(0)}%
            </Badge>
          </div>

          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 space-y-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-800 dark:text-amber-200">⚠️ {w}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="confirm-date">Date</Label>
              <Input id="confirm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-amount">Amount</Label>
              <Input
                id="confirm-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirm-merchant">Merchant</Label>
            <Input id="confirm-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="mr-2">{c.icon}</span>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirm-note">Note (optional)</Label>
            <Textarea
              id="confirm-note"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything to remember about this receipt"
            />
          </div>
        </div>

        <SheetFooter>
          {!reportId && (
            <p className="text-xs text-muted-foreground">
              Open a draft report to attach this receipt as an expense.
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
              Save as receipt only
            </Button>
            <Button className="flex-1" onClick={saveAsExpense} disabled={saving || !reportId}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save as expense
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
