import "server-only";

import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logo() {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr>
      <td style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#d946ef 55%,#22d3ee);text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;">P</td>
      <td style="padding-left:12px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;color:#f8fafc;letter-spacing:-0.2px;">PayPilot AI</td>
    </tr>
  </table>`;
}

function shell(options: {
  eyebrow: string;
  title: string;
  body: string;
  footerNote?: string;
  preview: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#06060b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#06060b;background-image:radial-gradient(circle at 20% 0%, rgba(139,92,246,0.18), transparent 45%),radial-gradient(circle at 85% 10%, rgba(34,211,238,0.12), transparent 40%);padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid rgba(255,255,255,0.09);border-radius:20px;background-color:#0d0d17;padding:32px;">
          <tr>
            <td>
              ${logo()}
              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#8b5cf6;font-weight:700;">${escapeHtml(options.eyebrow)}</p>
              <h1 style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:26px;line-height:1.25;font-weight:700;color:#f8fafc;letter-spacing:-0.4px;">${escapeHtml(options.title)}</h1>
              <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:#b6bed0;">${options.body}</div>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:28px 0 20px;" />
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b748a;">${escapeHtml(options.footerNote ?? "PayPilot AI runs in PayPal Sandbox for this hackathon. No live money moves.")}</p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#4c556b;">PayPilot AI · Think smarter. Pay faster. Stay in control.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailTable(rows: { label: string; value: string }[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;border:1px solid rgba(255,255,255,0.08);border-radius:12px;background-color:rgba(255,255,255,0.03);padding:4px 16px;">
    ${rows
      .map(
        (row, index) => `<tr>
          <td style="padding:12px 0;${index < rows.length - 1 ? "border-bottom:1px solid rgba(255,255,255,0.06);" : ""}font-family:Arial,sans-serif;font-size:13px;color:#8b93a7;">${escapeHtml(row.label)}</td>
          <td align="right" style="padding:12px 0;${index < rows.length - 1 ? "border-bottom:1px solid rgba(255,255,255,0.06);" : ""}font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#f1f5f9;">${escapeHtml(row.value)}</td>
        </tr>`
      )
      .join("")}
  </table>`;
}

function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;">
    <tr>
      <td style="border-radius:10px;background:linear-gradient(120deg,#8b5cf6,#6d28d9);">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function maskIp(ip: string | null | undefined) {
  if (!ip) return "Not recorded";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    return `${parts.slice(0, 3).join(".")}.x`;
  }
  return ip.slice(0, 10) + "…";
}

export function loginNotificationEmail(input: {
  name: string;
  provider: string;
  timestamp: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const safeName = input.name.split(" ")[0] || "there";
  const body = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(safeName)},</p>
    <p style="margin:0 0 12px;">You just signed in to PayPilot AI. If this was you, nothing else is needed.</p>
    ${detailTable([
      { label: "Time", value: formatDateTime(input.timestamp) },
      { label: "Sign in method", value: input.provider },
      { label: "Network", value: maskIp(input.ip) },
      { label: "Device", value: (input.userAgent || "Unknown device").slice(0, 80) },
    ])}
    <p style="margin:16px 0 0;font-size:13px;color:#8b93a7;">If you did not sign in, change your provider password and reply to this email.</p>`;
  return {
    subject: "New sign in to PayPilot AI",
    html: shell({
      eyebrow: "Security activity",
      title: "You signed in to PayPilot AI",
      body,
      preview: "Here is the timestamp and device for your latest sign in.",
      footerNote: "This message goes only to the verified email on your account.",
    }),
    text: `Hi ${safeName},\n\nYou signed in to PayPilot AI on ${formatDateTime(input.timestamp)} using ${input.provider}.\n\nIf this was not you, secure your account now.`,
  };
}

export function paymentReceivedEmail(input: {
  name: string;
  amount: number;
  currency: string;
  customer: string;
  orderId: string;
  invoiceNumber?: string | null;
  demo?: boolean;
}) {
  const body = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(input.name.split(" ")[0] || "there")},</p>
    <p style="margin:0 0 12px;">A PayPal Sandbox order was captured and recorded in your ledger.</p>
    ${detailTable([
      { label: "Amount", value: formatCurrency(input.amount, input.currency) },
      { label: "From", value: input.customer },
      ...(input.invoiceNumber ? [{ label: "Reference", value: input.invoiceNumber }] : []),
      { label: "PayPal order", value: input.orderId },
    ])}
    <p style="margin:16px 0 0;font-size:13px;color:#8b93a7;">${input.demo ? "This is demonstration data." : "Captured server side after sandbox approval."}</p>`;
  return {
    subject: `Payment received: ${formatCurrency(input.amount, input.currency)}`,
    html: shell({
      eyebrow: "Payment captured",
      title: "Money landed in your sandbox ledger",
      body,
      preview: `${formatCurrency(input.amount, input.currency)} from ${input.customer}`,
    }),
    text: `Payment received: ${formatCurrency(input.amount, input.currency)} from ${input.customer}. PayPal order ${input.orderId}.`,
  };
}

export function invoiceCreatedEmail(input: {
  name: string;
  kind: "invoice" | "payment_request";
  invoiceNumber: string;
  customer: string;
  amount: number;
  currency: string;
  dueDate?: string | null;
  url: string;
}) {
  const body = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(input.name.split(" ")[0] || "there")},</p>
    <p style="margin:0 0 12px;">Your ${input.kind === "invoice" ? "invoice" : "payment request"} is saved and ready to share.</p>
    ${detailTable([
      { label: "Reference", value: input.invoiceNumber },
      { label: "Customer", value: input.customer },
      { label: "Amount", value: formatCurrency(input.amount, input.currency) },
      { label: "Due", value: input.dueDate ? formatDate(input.dueDate) : "No due date" },
    ])}
    ${button("Open in PayPilot", input.url)}`;
  return {
    subject: `${input.kind === "invoice" ? "Invoice" : "Payment request"} ${input.invoiceNumber} is ready`,
    html: shell({
      eyebrow: "Workspace update",
      title: `${input.kind === "invoice" ? "Invoice" : "Payment request"} saved`,
      body,
      preview: `${input.invoiceNumber} for ${formatCurrency(input.amount, input.currency)}`,
    }),
    text: `${input.invoiceNumber} for ${formatCurrency(input.amount, input.currency)} is ready. ${input.url}`,
  };
}

export function paymentReminderEmail(input: {
  customer: string;
  senderName: string;
  reference: string;
  amount: number;
  currency: string;
  dueDate?: string | null;
  payUrl?: string | null;
}) {
  const body = `
    <p style="margin:0 0 12px;">Hi ${escapeHtml(input.customer)},</p>
    <p style="margin:0 0 12px;">A friendly reminder from ${escapeHtml(input.senderName)} about an open payment.</p>
    ${detailTable([
      { label: "Reference", value: input.reference },
      { label: "Amount", value: formatCurrency(input.amount, input.currency) },
      { label: "Due", value: input.dueDate ? formatDate(input.dueDate) : "No due date" },
    ])}
    ${input.payUrl ? button("Review and pay", input.payUrl) : ""}
    <p style="margin:16px 0 0;font-size:13px;color:#8b93a7;">Sent on behalf of ${escapeHtml(input.senderName)} through PayPilot AI.</p>`;
  return {
    subject: `Payment reminder: ${input.reference}`,
    html: shell({
      eyebrow: "Payment reminder",
      title: `${formatCurrency(input.amount, input.currency)} is still open`,
      body,
      preview: `Reminder for ${input.reference}`,
    }),
    text: `Hi ${input.customer}, a reminder from ${input.senderName} about ${input.reference} for ${formatCurrency(input.amount, input.currency)}.`,
  };
}
