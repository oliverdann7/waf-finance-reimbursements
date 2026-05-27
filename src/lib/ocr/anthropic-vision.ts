import Anthropic from "@anthropic-ai/sdk";
import { EXPENSE_CATEGORIES } from "@/types";
import type { OCRProvider, OCRResult } from "./types";

const MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MODEL = process.env.ANTHROPIC_OCR_MODEL || "claude-sonnet-4-6";

const CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value);
const TITHE_CATEGORY_VALUES = ["TITHE", "GENERAL_OFFERING", "SPECIAL_OFFERING", "DESIGNATED_OFFERING"];

const SYSTEM_PROMPT = `You extract structured data from receipts, invoices, bank statements, and church offering count sheets / deposit slips.

Always call the extract_receipt tool exactly once. If you cannot read a field, set it to null. Never invent values you cannot see in the image. Confidence should reflect how clearly the document was readable.

Date format: YYYY-MM-DD. Amount: numeric, in the receipt's currency, do not multiply or convert.

When the document looks like a normal commercial receipt, pick the closest match from this expense category list:
${CATEGORY_VALUES.join(", ")}.

When the document looks like a church offering count sheet, deposit slip, or tithe envelope tally, pick the closest match from this tithe category list:
${TITHE_CATEGORY_VALUES.join(", ")}.

If you genuinely cannot tell, return null for suggested_category.`;

const TOOL_DEFINITION: Anthropic.Tool = {
  name: "extract_receipt",
  description: "Return the structured fields extracted from the document.",
  input_schema: {
    type: "object",
    properties: {
      date: { type: ["string", "null"], description: "Transaction date as YYYY-MM-DD, or null if not visible." },
      merchant: { type: ["string", "null"], description: "Merchant / vendor / payee / church name as shown." },
      amount: { type: ["number", "null"], description: "Total amount as a number in the document's currency." },
      currency: { type: ["string", "null"], description: "ISO 4217 currency code (e.g. TRY, USD, EUR) or null." },
      payment_method: { type: ["string", "null"], description: "e.g. Cash, Credit Card, Bank Transfer, Bank Receipt." },
      suggested_category: {
        type: ["string", "null"],
        enum: [...CATEGORY_VALUES, ...TITHE_CATEGORY_VALUES, null],
        description: "Best category match from the appropriate list, or null.",
      },
      confidence: { type: "number", description: "0–1 confidence that the parsed fields are correct." },
      raw_text: { type: "string", description: "Plain-text transcript of the visible text on the document." },
    },
    required: ["date", "merchant", "amount", "currency", "payment_method", "suggested_category", "confidence", "raw_text"],
  },
};

type ExtractInput = {
  date: string | null;
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  suggested_category: string | null;
  confidence: number;
  raw_text: string;
};

function buildContent(buffer: Buffer, mimeType: string): Anthropic.ContentBlockParam[] {
  const base64 = buffer.toString("base64");
  const text: Anthropic.TextBlockParam = {
    type: "text",
    text: "Extract the fields from this document. Call extract_receipt exactly once.",
  };

  if (mimeType === "application/pdf") {
    return [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      } as Anthropic.ContentBlockParam,
      text,
    ];
  }

  const imageType = (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)
    ? mimeType
    : "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  return [
    {
      type: "image",
      source: { type: "base64", media_type: imageType, data: base64 },
    },
    text,
  ];
}

export class AnthropicVisionProvider implements OCRProvider {
  name = "Anthropic Claude Vision";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async processReceipt(buffer: Buffer, mimeType: string): Promise<OCRResult> {
    if (buffer.byteLength > MAX_BYTES) {
      return {
        success: false,
        data: emptyData(),
        confidence: 0,
        rawText: "",
        error: `File too large for vision extraction (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB > 5 MB).`,
      };
    }

    try {
      const response = await this.client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: [TOOL_DEFINITION],
        tool_choice: { type: "tool", name: "extract_receipt" },
        messages: [{ role: "user", content: buildContent(buffer, mimeType) }],
      });

      const toolBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "extract_receipt",
      );

      if (!toolBlock) {
        return {
          success: false,
          data: emptyData(),
          confidence: 0,
          rawText: "",
          error: "Model returned no extraction.",
        };
      }

      const extracted = toolBlock.input as ExtractInput;
      const confidence = clamp01(extracted.confidence);

      return {
        success: true,
        data: {
          date: normalizeDate(extracted.date),
          merchant: extracted.merchant ?? null,
          amount: typeof extracted.amount === "number" ? extracted.amount : null,
          currency: extracted.currency ?? null,
          paymentMethod: extracted.payment_method ?? null,
          suggestedCategory: extracted.suggested_category ?? null,
        },
        confidence,
        rawText: extracted.raw_text ?? "",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vision extraction failed";
      return {
        success: false,
        data: emptyData(),
        confidence: 0,
        rawText: "",
        error: message,
      };
    }
  }
}

function emptyData() {
  return {
    date: null,
    merchant: null,
    amount: null,
    currency: null,
    paymentMethod: null,
    suggestedCategory: null,
  };
}

function clamp01(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
