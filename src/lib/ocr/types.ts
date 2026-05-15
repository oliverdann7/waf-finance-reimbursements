export interface OCRParsedData {
  date: string | null;
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  paymentMethod: string | null;
  suggestedCategory: string | null;
}

export interface OCRResult {
  success: boolean;
  data: OCRParsedData;
  confidence: number;
  rawText: string;
  error?: string;
}

export interface OCRProvider {
  name: string;
  processReceipt(fileBuffer: Buffer, mimeType: string): Promise<OCRResult>;
}
