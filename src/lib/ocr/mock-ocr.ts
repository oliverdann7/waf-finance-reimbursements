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
];

export class MockOCRProvider implements OCRProvider {
  name = "Mock OCR";

  async processReceipt(_buffer: Buffer, _mimeType: string): Promise<OCRResult> {
    await new Promise((r) => setTimeout(r, 1500));

    const mock = MOCK_EXTRACTIONS[Math.floor(Math.random() * MOCK_EXTRACTIONS.length)];

    return {
      success: true,
      data: {
        date: mock.date,
        merchant: mock.merchant,
        amount: mock.amount,
        currency: mock.currency,
        paymentMethod: mock.paymentMethod,
        suggestedCategory: mock.suggestedCategory,
      },
      confidence: 0.85 + Math.random() * 0.1,
      rawText: `Receipt from ${mock.merchant}\nDate: ${mock.date}\nAmount: ${mock.amount} ${mock.currency}\nPayment: ${mock.paymentMethod}\n---\nMOCK OCR EXTRACTION - NOT FROM REAL RECEIPT`,
    };
  }
}
