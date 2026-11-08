import type { InvoiceKind } from "@/types/database";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function suffix(length = 4) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function createInvoiceNumber(
  kind: InvoiceKind = "invoice",
  options: { demo?: boolean; date?: Date } = {}
) {
  const date = options.date ?? new Date();
  const stamp = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const prefix = kind === "payment_request" ? "PR" : "INV";
  const demo = options.demo ? "DEMO-" : "";
  return `${demo}${prefix}-${stamp}-${suffix()}`;
}
