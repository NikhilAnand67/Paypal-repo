import type { Currency } from "@/types/database";

export const APP_NAME = "PayPilot AI";
export const APP_TAGLINE = "Think smarter. Pay faster. Stay in control.";

export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "SEK", label: "Swedish Krona", symbol: "kr" },
  { code: "NZD", label: "New Zealand Dollar", symbol: "NZ$" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
];

export const PAYPAL_CURRENCIES: Currency[] = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "SEK",
  "NZD",
  "SGD",
  "HKD",
];

export const DEMO_PREFIX = "DEMO";

export const MAX_AMOUNT = 1_000_000;
export const MIN_AMOUNT = 0.01;

export const AGENT_SUGGESTIONS = [
  "Create a $250 payment request for my website development client, due in seven days",
  "Which invoices are still pending?",
  "Summarize my payment activity",
  "Analyze my payment trends",
  "Create an invoice for $480 for brand identity work, due in 14 days",
  "Remind me about unpaid invoices",
];

export const AGENT_TOOLS = [
  {
    name: "get_transactions",
    label: "Read transactions",
    description: "Summarizes the signed in user's own ledger.",
    safe: true,
  },
  {
    name: "get_invoice_summary",
    label: "Read invoices",
    description: "Groups invoices and payment requests by status.",
    safe: true,
  },
  {
    name: "analyze_cashflow",
    label: "Analyze cash flow",
    description: "Computes monthly collected and outstanding totals.",
    safe: true,
  },
  {
    name: "create_invoice_draft",
    label: "Draft an invoice",
    description: "Prepares a draft. Requires your confirmation.",
    safe: false,
  },
  {
    name: "create_payment_request",
    label: "Prepare a payment request",
    description: "Prepares a request. Requires your confirmation.",
    safe: false,
  },
  {
    name: "collect_payment",
    label: "Start PayPal checkout",
    description: "Creates a sandbox order only after approval.",
    safe: false,
  },
  {
    name: "send_reminder",
    label: "Send a reminder",
    description: "Emails a customer through your verified sender.",
    safe: false,
  },
];

export const SIDEBAR_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "layout-dashboard" },
  { href: "/ai-agent", label: "AI agent", icon: "sparkles" },
  { href: "/transactions", label: "Transactions", icon: "arrow-left-right" },
  { href: "/invoices", label: "Invoices", icon: "file-text" },
  { href: "/payment-requests", label: "Payment requests", icon: "hand-coins" },
  { href: "/analytics", label: "Analytics", icon: "chart-no-axes-column" },
  { href: "/notifications", label: "Notifications", icon: "bell" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export const TOOL_LABELS: Record<string, string> = {
  create_invoice: "Invoice draft",
  create_payment_request: "Payment request",
  send_reminder: "Payment reminder",
  collect_payment: "PayPal checkout",
};
