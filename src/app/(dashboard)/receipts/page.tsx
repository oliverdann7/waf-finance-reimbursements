"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, startTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Sparkles, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { ReceiptDropzone } from "@/components/receipts/receipt-dropzone";
import { ReceiptConfirmSheet, type ParsedReceipt } from "@/components/receipts/receipt-confirm-sheet";

interface ReceiptItem {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  parsedMerchant: string;
  parsedAmount: number | null;
  confidenceScore: number;
  uploadDate: string;
  expenseId: string | null;
}

interface DraftReport {
  id: string;
  month: number;
  year: number;
  status: string;
}

function ReceiptsContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const expenseId = searchParams.get("expenseId");
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [draftReportId, setDraftReportId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmReceipt, setConfirmReceipt] = useState<ParsedReceipt | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadReceipts = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/receipts", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json)) setReceipts(json);
    } catch {
      // fetch failed or timed out
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDraft = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/reports?status=DRAFT", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return;
      const reports = (await res.json()) as DraftReport[];
      if (Array.isArray(reports) && reports.length > 0) {
        setDraftReportId(reports[0].id);
      }
    } catch {
      // fetch failed or timed out
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    void Promise.resolve().then(() => {
      void loadReceipts();
      void loadDraft();
    });
  }, [status, loadReceipts, loadDraft]);

  async function handleFile(file: File, preview: string | null) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is over 5 MB. Please use a smaller image.");
      return;
    }

    setUploading(true);
    setPreviewUrl(preview);
    const form = new FormData();
    form.append("file", file);
    if (expenseId) form.append("expenseId", expenseId);

    try {
      const res = await fetch("/api/receipts/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to upload receipt");
        return;
      }
      toast.success("Receipt scanned");
      setConfirmReceipt(json.receipt as ParsedReceipt);
      setWarnings(
        Array.isArray(json.warnings) ? json.warnings.map((w: { message: string }) => w.message) : [],
      );
      setConfirmOpen(true);
      await loadReceipts();
    } catch {
      toast.error("Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  }

  if (status === "loading") return <div className="animate-pulse text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
            <p className="text-muted-foreground mt-1">
              Snap a photo — we&apos;ll read the date, amount and category for you.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">Smart receipt scan</span>
          </div>
          <ReceiptDropzone
            onFileSelected={handleFile}
            scanning={uploading}
            scanningLabel="Reading your receipt…"
          />
          {!draftReportId && (
            <p className="text-xs text-muted-foreground text-center">
              Tip: open a <Link href="/reports" className="underline">draft report</Link> first if you want to save scanned receipts as expenses in one tap.
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading receipts...</div>
      ) : receipts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No receipts yet</p>
              <p className="text-sm text-muted-foreground">
                Upload a photo above and we&apos;ll extract the details automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {receipts.map((receipt) => (
            <Link key={receipt.id} href={`/receipts/${receipt.id}`}>
              <Card className="h-full transition hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{receipt.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(receipt.fileSize / 1024).toFixed(1)} KB &middot; {receipt.fileType}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        receipt.confidenceScore > 0.8
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : receipt.confidenceScore > 0.5
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {(receipt.confidenceScore * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="border-t pt-3 space-y-1 text-sm">
                    {receipt.parsedMerchant && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Merchant</span>
                        <span className="font-medium">{receipt.parsedMerchant}</span>
                      </div>
                    )}
                    {receipt.parsedAmount != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">{receipt.parsedAmount.toFixed(2)} TRY</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uploaded</span>
                      <span>{new Date(receipt.uploadDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {receipt.expenseId ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Linked to expense
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <XCircle className="h-3 w-3" /> Review needed
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ReceiptConfirmSheet
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            void loadReceipts();
            router.refresh();
          }
        }}
        receipt={confirmReceipt}
        previewUrl={previewUrl}
        warnings={warnings}
        reportId={draftReportId}
      />
    </div>
  );
}

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-muted-foreground">Loading receipts...</div>}>
      <ReceiptsContent />
    </Suspense>
  );
}
