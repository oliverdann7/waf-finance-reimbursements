import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type StoredFile = {
  url: string;
  key: string;
  provider: "vercel-blob" | "local";
};

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);
}

export async function storeReceiptFile(file: File, userId: string): Promise<StoredFile> {
  const key = `receipts/${userId}/${Date.now()}-${randomUUID()}-${safeName(file.name)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return { url: blob.url, key, provider: "vercel-blob" };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadRoot = process.env.LOCAL_UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".uploads");
  const destination = path.join(/*turbopackIgnore: true*/ uploadRoot, key);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);

  return {
    url: `/api/uploads/${key}`,
    key,
    provider: "local",
  };
}

export const ACCEPTED_RECEIPT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/octet-stream",
];

export function isAcceptedReceiptType(file: File) {
  return ACCEPTED_RECEIPT_TYPES.includes(file.type) || /\.(pdf|jpe?g|png|webp|gif|csv|txt)$/i.test(file.name);
}
