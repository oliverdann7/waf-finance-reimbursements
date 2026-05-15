"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

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

function ReceiptsContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const expenseId = searchParams.get("expenseId");
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadReceipts = useCallback(async () => {
    const res = await fetch("/api/receipts");
    if (!res.ok) return;
    const json = await res.json();
    if (Array.isArray(json)) setReceipts(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") void Promise.resolve().then(loadReceipts);
  }, [status, loadReceipts]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    if (expenseId) form.append("expenseId", expenseId);

    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const res = await fetch("/api/receipts/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error();
      toast.success("Receipt uploaded and scanned!");
      await loadReceipts();
      router.refresh();
    } catch {
      toast.error("Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  }

  if (status === "loading") return <div className="animate-pulse text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
            <p className="text-muted-foreground mt-1">Upload PDFs, images, and bank receipt files for OCR review</p>
          </div>
        </div>
        <div>
          <Button disabled={uploading} className="relative">
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Scanning..." : "Upload Receipt"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.csv,.txt"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleUpload}
              disabled={uploading}
            />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading receipts...</div>
      ) : receipts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No receipts uploaded yet</p>
            <Button disabled={uploading} className="relative">
              Upload Your First Receipt
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.csv,.txt"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleUpload}
                disabled={uploading}
              />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {receipts.map((receipt) => (
            <Link key={receipt.id} href={`/receipts/${receipt.id}`}><Card className="h-full transition hover:shadow-md">
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
                        ? "bg-green-50 text-green-700"
                        : receipt.confidenceScore > 0.5
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-red-50 text-red-700"
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
                  {receipt.parsedAmount && (
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
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> Linked to expense
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-yellow-600">
                      <XCircle className="h-3 w-3" /> Review needed
                    </span>
                  )}
                </div>
              </CardContent>
            </Card></Link>
          ))}
        </div>
      )}
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
