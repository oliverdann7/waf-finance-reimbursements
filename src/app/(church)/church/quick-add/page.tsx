"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ReceiptDropzone } from "@/components/receipts/receipt-dropzone";

type Step = "capture" | "confirm" | "done";

const OFFERING_TYPES = [
  { value: "TITHE", label: "Tithe" },
  { value: "GENERAL_OFFERING", label: "General Offering" },
  { value: "SPECIAL_OFFERING", label: "Special Offering" },
  { value: "DESIGNATED_OFFERING", label: "Designated Offering" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface QuickAddResult {
  report: { id: string; month: number; year: number; totalTithe: number; totalSpecialOfferings: number; totalIncome: number };
  ocr: { confidence: number; suggestedType: string; parsedDate: string | null; parsedAmount: number | null };
}

export default function QuickAddPage() {
  const { status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<Step>("capture");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState("GENERAL_OFFERING");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [donorName, setDonorName] = useState("");
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState(0);

  const [result, setResult] = useState<QuickAddResult | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  async function handleFileSelected(picked: File, preview: string | null) {
    if (picked.size > 5 * 1024 * 1024) {
      toast.error("File over 5 MB — pick a smaller image.");
      return;
    }
    setFile(picked);
    setPreviewUrl(preview);
    setScanning(true);

    // Run OCR via the receipts endpoint (auth + storage already wired)
    const form = new FormData();
    form.append("file", picked);
    try {
      const res = await fetch("/api/ocr", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json?.data) {
        toast.error("Could not read the photo — please fill in the fields by hand.");
      } else {
        setDate(json.data.date ?? "");
        setAmount(json.data.amount != null ? String(json.data.amount) : "");
        const sug = (json.data.suggestedCategory ?? "").toUpperCase();
        if (["TITHE", "GENERAL_OFFERING", "SPECIAL_OFFERING", "DESIGNATED_OFFERING"].includes(sug)) {
          setType(sug);
        }
        setConfidence(json.confidence ?? 0);
      }
    } catch {
      toast.error("Could not read the photo — please fill in the fields by hand.");
    } finally {
      setScanning(false);
      setStep("confirm");
    }
  }

  async function submit() {
    if (!file) return;
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter an amount.");
      return;
    }
    setSaving(true);
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    form.append("amount", amount);
    if (date) form.append("date", date);
    if (donorName) form.append("donorName", donorName);
    if (notes) form.append("notes", notes);

    try {
      const res = await fetch("/api/church-reports/quick-add", { method: "POST", body: form });
      const json = (await res.json()) as QuickAddResult & { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Failed to record offering");
        return;
      }
      setResult(json);
      setStep("done");
      toast.success("Offering recorded");
    } catch {
      toast.error("Failed to record offering");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setAmount("");
    setDate("");
    setDonorName("");
    setNotes("");
    setType("GENERAL_OFFERING");
    setConfidence(0);
    setResult(null);
    setStep("capture");
  }

  if (status === "loading") return <div className="animate-pulse text-muted-foreground">Loading...</div>;

  const confidenceLabel =
    confidence >= 0.85 ? "High confidence" : confidence >= 0.5 ? "Medium confidence" : "Low confidence — please check";
  const confidenceClass =
    confidence >= 0.85
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : confidence >= 0.5
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/church/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quick Add Offering</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Snap a deposit slip or count sheet — we&apos;ll read the amount and date.
          </p>
        </div>
      </div>

      {step === "capture" && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Step 1 of 2 · Take a photo</CardTitle>
            </div>
            <CardDescription>
              Works with deposit slips, offering count sheets, or a written note of the total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReceiptDropzone
              onFileSelected={handleFileSelected}
              scanning={scanning}
              scanningLabel="Reading the photo…"
              idleLabel="Tap to take a photo or upload"
              helperText="JPG, PNG, WebP or PDF — up to 5 MB"
            />
          </CardContent>
        </Card>
      )}

      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2 of 2 · Confirm details</CardTitle>
            <CardDescription>Fix anything that looks off, then save.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewUrl && (
              <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Captured" className="w-full max-h-56 object-contain" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">From your photo</span>
              <Badge variant="outline" className={confidenceClass}>
                {confidenceLabel}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="qa-date">Date</Label>
                <Input id="qa-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qa-amount">Amount</Label>
                <Input
                  id="qa-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFERING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="qa-donor">Donor / source (optional)</Label>
              <Input
                id="qa-donor"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="e.g. Sunday service, anonymous"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="qa-notes">Notes (optional)</Label>
              <Textarea id="qa-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={reset} disabled={saving}>
                Retake
              </Button>
              <Button className="flex-1" onClick={submit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Save offering
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <CardTitle className="text-base">Offering recorded</CardTitle>
            </div>
            <CardDescription>
              Added to {MONTH_NAMES[result.report.month - 1]} {result.report.year} draft report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Tithe</p>
                <p className="text-lg font-semibold">{result.report.totalTithe.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Offerings</p>
                <p className="text-lg font-semibold">{result.report.totalSpecialOfferings.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{result.report.totalIncome.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                Add another
              </Button>
              <Button className="flex-1" asChild>
                <Link href={`/church/reports/${result.report.id}`}>
                  Open report <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
