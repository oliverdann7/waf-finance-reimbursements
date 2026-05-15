import type { OCRProvider, OCRResult } from "./types";
import { MockOCRProvider } from "./mock-ocr";

let provider: OCRProvider | null = null;

function getProvider(): OCRProvider {
  if (provider) return provider;

  if (process.env.OCR_API_KEY) {
    provider = {
      name: "Real OCR Provider",
      async processReceipt(buffer, mimeType) {
        const form = new FormData();
        form.append("file", new Blob([buffer as BlobPart], { type: mimeType }), "receipt");

        const res = await fetch(process.env.OCR_API_URL || "https://api.ocr-service.com/process", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OCR_API_KEY}` },
          body: form,
        });

        return res.json();
      },
    };
  } else {
    provider = new MockOCRProvider();
  }

  return provider;
}

export async function processReceipt(
  buffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  const p = getProvider();
  return p.processReceipt(buffer, mimeType);
}

export { type OCRProvider, type OCRResult } from "./types";
