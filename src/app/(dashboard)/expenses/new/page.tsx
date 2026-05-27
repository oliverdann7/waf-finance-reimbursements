"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/types";
import { toast } from "sonner";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function NewExpenseForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [category, setCategory] = useState("");

  if (status === "loading") {
    return <div className="animate-pulse text-muted-foreground">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setWarnings([]);

    const form = new FormData(e.currentTarget);
    const data = {
      date: form.get("date") as string,
      merchant: form.get("merchant") as string,
      description: form.get("description") as string,
      category: form.get("category") as string,
      amount: parseFloat(form.get("amount") as string),
      currency: form.get("currency") as string,
      exchangeRate: parseFloat(form.get("exchangeRate") as string),
      reportId: form.get("reportId") as string,
    };

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (json.warnings?.length > 0) {
        setWarnings(json.warnings.map((w: { message: string }) => w.message));
      }

      if (!res.ok) {
        toast.error(json.error || "Failed to create expense");
        return;
      }

      toast.success("Expense added!");
      if (json.reportId) {
        router.push(`/reports/${json.reportId}`);
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Failed to create expense");
    } finally {
      setLoading(false);
    }
  }

  const amountInTRY = parseFloat(amount || "0") * parseFloat(exchangeRate || "1");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={reportId ? `/reports/${reportId}` : "/dashboard"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Expense</h1>
          <p className="text-muted-foreground mt-1">Add an expense to your report</p>
        </div>
      </div>

      {warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4 space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
          <CardDescription>Enter the expense information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input type="hidden" name="reportId" value={reportId || ""} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" value={category} onValueChange={(v) => v && setCategory(v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant">Merchant / Vendor</Label>
              <Input id="merchant" name="merchant" placeholder="Merchant name" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Describe the expense" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select name="currency" value={currency} onValueChange={(v) => v && setCurrency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchangeRate">Exchange Rate</Label>
                <Input
                  id="exchangeRate"
                  name="exchangeRate"
                  type="number"
                  step="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
              </div>
            </div>

            {amountInTRY > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 text-sm">
                Amount in TRY: <strong>{amountInTRY.toFixed(2)}</strong>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Any additional notes..." />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Expense
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={reportId ? `/reports/${reportId}` : "/dashboard"}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense>
      <NewExpenseForm />
    </Suspense>
  );
}
