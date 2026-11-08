import { type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireApiUser, enforceRateLimit } from "@/lib/api/guards";
import { jsonError } from "@/lib/security/http";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import type { Invoice } from "@/types/database";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REPLACEMENTS: Record<string, string> = {
  "€": "EUR ",
  "£": "GBP ",
  "¥": "JPY ",
  "–": "-",
  "—": "-",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "•": "-",
  "…": "...",
  "×": "x",
};

function ascii(value: string) {
  return value
    .replace(/[€£¥–—‘’“”•…×]/g, (char) => REPLACEMENTS[char] ?? "")
    .replace(/[^\x20-\x7E\n]/g, "");
}

function wrap(text: string, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

function money(amount: number, currency: string) {
  const digits = currency === "JPY" ? 0 : 2;
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function dateOnly(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "invoice-pdf", 30);
  if (!limited.ok) return limited.response;

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return jsonError(400, "That request id is not valid.", { code: "invalid_id" });
  }

  const { data, error } = await account.supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError(503, "The request is not available yet.", {
      code: friendlyDatabaseError(error) ?? "invoice_unavailable",
    });
  }
  if (!data) {
    return jsonError(404, "That record was not found on your account.", {
      code: "invoice_not_found",
    });
  }

  const invoice = data as Invoice;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${invoice.invoice_number} - PayPilot AI`);
  pdf.setAuthor("PayPilot AI");
  pdf.setSubject(invoice.kind === "invoice" ? "Invoice" : "Payment request");
  pdf.setCreator("PayPilot AI Sandbox");

  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const violet = rgb(0.545, 0.361, 0.965);
  const ink = rgb(0.06, 0.06, 0.09);
  const muted = rgb(0.42, 0.45, 0.52);
  const line = rgb(0.88, 0.89, 0.93);
  const margin = 48;

  page.drawRectangle({ x: 0, y: height - 104, width, height: 104, color: violet });
  page.drawText("PayPilot AI", {
    x: margin,
    y: height - 60,
    size: 22,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("AI FINANCIAL OPERATIONS / PAYPAL SANDBOX", {
    x: margin,
    y: height - 80,
    size: 9,
    font: regular,
    color: rgb(0.93, 0.9, 1),
  });
  page.drawText(invoice.kind === "invoice" ? "INVOICE" : "PAYMENT REQUEST", {
    x: width - margin - (invoice.kind === "invoice" ? 92 : 150),
    y: height - 60,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(ascii(invoice.invoice_number), {
    x: width - margin - 120,
    y: height - 80,
    size: 10,
    font: regular,
    color: rgb(0.95, 0.93, 1),
  });

  let y = height - 150;

  if (invoice.is_demo) {
    page.drawRectangle({
      x: margin,
      y: y - 26,
      width: width - margin * 2,
      height: 34,
      color: rgb(1, 0.97, 0.9),
      borderColor: rgb(0.96, 0.75, 0.35),
      borderWidth: 1,
    });
    page.drawText("DEMONSTRATION DATA. This document is not a real invoice or payment record.", {
      x: margin + 12,
      y: y - 14,
      size: 9,
      font: bold,
      color: rgb(0.55, 0.38, 0.05),
    });
    y -= 52;
  }

  page.drawText("Billed to", { x: margin, y, size: 9, font: bold, color: muted });
  y -= 18;
  page.drawText(ascii(invoice.customer_name), { x: margin, y, size: 14, font: bold, color: ink });
  y -= 16;
  if (invoice.customer_email) {
    page.drawText(ascii(invoice.customer_email), { x: margin, y, size: 10, font: regular, color: muted });
    y -= 14;
  }

  const metaX = width - margin - 170;
  page.drawText("Issued", { x: metaX, y: height - 168, size: 9, font: bold, color: muted });
  page.drawText(dateOnly(invoice.created_at), {
    x: metaX + 58,
    y: height - 168,
    size: 10,
    font: regular,
    color: ink,
  });
  page.drawText("Due", { x: metaX, y: height - 186, size: 9, font: bold, color: muted });
  page.drawText(dateOnly(invoice.due_date), {
    x: metaX + 58,
    y: height - 186,
    size: 10,
    font: regular,
    color: ink,
  });
  page.drawText("Status", { x: metaX, y: height - 204, size: 9, font: bold, color: muted });
  page.drawText(invoice.status.toUpperCase(), {
    x: metaX + 58,
    y: height - 204,
    size: 10,
    font: bold,
    color: ink,
  });

  y = Math.min(y, height - 240);
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, color: line, thickness: 1 });
  y -= 28;

  page.drawText("Scope", { x: margin, y, size: 9, font: bold, color: muted });
  y -= 18;
  const description = ascii(invoice.description || "Professional services");
  for (const text of wrap(description, regular, 11, width - margin * 2)) {
    page.drawText(text, { x: margin, y, size: 11, font: regular, color: ink });
    y -= 16;
  }

  if (invoice.notes) {
    y -= 10;
    page.drawText("Notes", { x: margin, y, size: 9, font: bold, color: muted });
    y -= 16;
    for (const text of wrap(ascii(invoice.notes), regular, 10, width - margin * 2)) {
      page.drawText(text, { x: margin, y, size: 10, font: regular, color: muted });
      y -= 14;
    }
  }

  const totalY = Math.max(y - 40, 190);
  page.drawRectangle({
    x: margin,
    y: totalY - 58,
    width: width - margin * 2,
    height: 70,
    color: rgb(0.965, 0.957, 0.99),
    borderColor: rgb(0.85, 0.82, 0.95),
    borderWidth: 1,
  });
  page.drawText("TOTAL DUE", {
    x: margin + 18,
    y: totalY - 14,
    size: 9,
    font: bold,
    color: muted,
  });
  page.drawText(money(Number(invoice.amount), invoice.currency), {
    x: margin + 18,
    y: totalY - 42,
    size: 24,
    font: bold,
    color: violet,
  });
  page.drawText(invoice.kind === "invoice" ? "Invoice" : "Payment request", {
    x: width - margin - 120,
    y: totalY - 14,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawText(ascii(invoice.invoice_number), {
    x: width - margin - 120,
    y: totalY - 36,
    size: 11,
    font: bold,
    color: ink,
  });

  page.drawLine({
    start: { x: margin, y: 96 },
    end: { x: width - margin, y: 96 },
    color: line,
    thickness: 1,
  });
  page.drawText("PayPilot AI / Think smarter. Pay faster. Stay in control.", {
    x: margin,
    y: 76,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawText("Sandbox demonstration. No live money moves. Payment status is verified server side.", {
    x: margin,
    y: 62,
    size: 8,
    font: regular,
    color: muted,
  });

  const bytes = await pdf.save();
  const filename = `${invoice.invoice_number.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;

  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
