"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.gif,.webp";

export interface ReceiptDropzoneProps {
  onFileSelected: (file: File, previewUrl: string | null) => void | Promise<void>;
  scanning?: boolean;
  scanningLabel?: string;
  idleLabel?: string;
  helperText?: string;
  className?: string;
}

export function ReceiptDropzone({
  onFileSelected,
  scanning = false,
  scanningLabel = "Scanning…",
  idleLabel = "Tap to upload or drop a photo",
  helperText = "JPG, PNG, WebP or PDF — up to 5 MB",
  className,
}: ReceiptDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      let previewUrl: string | null = null;
      if (file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);
      } else {
        setPreview(null);
      }
      await onFileSelected(file, previewUrl);
    },
    [onFileSelected],
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files)[0];
    if (file) void handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const clearPreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  return (
    <div
      className={cn("w-full", className)}
      onPaste={onPaste}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <label
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center transition-colors",
          "hover:border-primary/50 hover:bg-muted/30 cursor-pointer",
          dragging && "border-primary bg-primary/5",
          scanning && "pointer-events-none opacity-80",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={onChange}
          disabled={scanning}
        />

        {preview ? (
          <div className="relative w-full max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Receipt preview"
              className="rounded-xl border border-border max-h-64 mx-auto object-contain"
            />
            {!scanning && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  clearPreview();
                }}
                className="absolute -top-2 -right-2 rounded-full bg-background border border-border p-1 shadow-sm hover:bg-muted"
                aria-label="Remove preview"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <ImageIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">{idleLabel}</p>
            <p className="text-xs text-muted-foreground">{helperText}</p>
          </div>
        )}

        {scanning && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{scanningLabel}</span>
          </div>
        )}
      </label>

      <div className="mt-3 flex flex-wrap gap-2 justify-center sm:hidden">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={onChange}
          disabled={scanning}
        />
        <Button
          type="button"
          variant="default"
          onClick={() => cameraInputRef.current?.click()}
          disabled={scanning}
        >
          <Camera className="h-4 w-4" />
          Use camera
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
        >
          <Upload className="h-4 w-4" />
          Pick file
        </Button>
      </div>
    </div>
  );
}
