import type { OCRProvider, OCRResult } from "./types";

const MOCK_EXTRACTIONS = [
  {
    date: "2026-05-15",
    merchant: "Migros Market",
    amount: 450.75,
    currency: "TRY",
    paymentMethod: "Credit Card",
    suggestedCategory: "OTHER",
  },
  {
    date: "2026-05-14",
    merchant: "Turkish Telecom",
    amount: 299.00,
    currency: "TRY",
    paymentMethod: "Bank Transfer",
    suggestedCategory: "INTERNET",
  },
  {
    date: "2026-05-13",
    merchant: "Shell Petrol",
    amount: 1200.00,
    currency: "TRY",
    paymentMethod: "Credit Card",
    suggestedCategory: "MILEAGE",
  },
  {
    date: "2026-05-12",
    merchant: "Taxi Istanbul",
    amount: 85.50,
    currency: "TRY",
    paymentMethod: "Cash",
    suggestedCategory: "TAXI",
  },
  {
    date: "2026-05-11",
    merchant: "D&R Bookstore",
    amount: 320.00,
    currency: "TRY",
    paymentMethod: "Credit Card",
    suggestedCategory: "BOOKS",
  },
  {
    date: "2026-05-10",
    merchant: "Garanti BBVA Bank Statement",
    amount: 1840.25,
    currency: "TRY",
    paymentMethod: "Bank Transfer",
    suggestedCategory: "TRAVEL_MISC",
  },
  {
    date: "2026-05-09",
    merchant: "Enerjisa Electricity",
    amount: 980.40,
    currency: "TRY",
    paymentMethod: "Bank Receipt",
    suggestedCategory: "ELECTRICITY",
  },
];

export class MockOCRProvider implements OCRProvider {
  name = "Mock OCR";

  async processReceipt(buffer: Buffer, mimeType: string): Promise<OCRResult> {
    await new Promise((r) => setTimeout(r, 1500));

    const text = buffer.toString("utf8").slice(0, 4000);
    const mock = MOCK_EXTRACTIONS[Math.floor(Math.random() * MOCK_EXTRACTIONS.length)];
    const amountMatch = text.match(/(?:amount|total|tutar)\D{0,12}(\d+[.,]\d{2})/i);
    const dateMatch = text.match(/(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})/);
    const merchantMatch = text.match(/(?:merchant|vendor|işyeri|firma)[:\s-]+([^\n]{3,80})/i);
    const parsedAmount = amountMatch ? Number(amountMatch[1].replace(",", ".")) : mock.amount;

    return {
      success: true,
      data: {
        date: dateMatch?.[1]?.replace(/[/.]/g, "-") || mock.date,
        merchant: merchantMatch?.[1]?.trim() || mock.merchant,
        amount: parsedAmount,
        currency: mock.currency,
        paymentMethod: mock.paymentMethod,
        suggestedCategory: mock.suggestedCategory,
      },
      confidence: 0.85 + Math.random() * 0.1,
      rawText: text.trim() || `Receipt from ${mock.merchant}\nDate: ${mock.date}\nAmount: ${mock.amount} ${mock.currency}\nPayment: ${mock.paymentMethod}\nMIME: ${mimeType}\n---\nMOCK OCR EXTRACTION - NOT FROM REAL RECEIPT`,
    };
  }
}
