import { lastNMonths, parseDateOnly } from "@/lib/utils/dates";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type {
  AnalyticsSummary,
  Currency,
  Insight,
  Invoice,
  MonthlyPoint,
  Transaction,
  TransactionStatus,
} from "@/types/database";

const TRANSACTION_STATUSES: TransactionStatus[] = [
  "created",
  "approved",
  "completed",
  "failed",
  "refunded",
];

function numeric(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthKeyFromIso(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isOpenInvoice(invoice: Invoice) {
  return invoice.status === "pending" || invoice.status === "overdue";
}

function dominantCurrency(invoices: Invoice[], transactions: Transaction[], fallback: Currency) {
  const counts = new Map<Currency, number>();
  const add = (currency: Currency, amount: number) => {
    counts.set(currency, (counts.get(currency) ?? 0) + amount);
  };
  invoices.forEach((invoice) => add(invoice.currency, numeric(invoice.amount)));
  transactions.forEach((transaction) => add(transaction.currency, numeric(transaction.amount)));

  if ((counts.get(fallback) ?? 0) > 0) return fallback;

  let best: Currency = fallback;
  let bestValue = 0;
  counts.forEach((value, currency) => {
    if (value > bestValue) {
      best = currency;
      bestValue = value;
    }
  });
  return best;
}

export function buildAnalytics(
  invoicesInput: Invoice[],
  transactionsInput: Transaction[],
  fallbackCurrency: Currency = "USD",
  now = new Date()
): AnalyticsSummary {
  const invoices = invoicesInput.map((invoice) => ({
    ...invoice,
    amount: numeric(invoice.amount),
  }));
  const transactions = transactionsInput.map((transaction) => ({
    ...transaction,
    amount: numeric(transaction.amount),
  }));

  const baseCurrency = dominantCurrency(invoices, transactions, fallbackCurrency);

  const completed = transactions.filter((transaction) => transaction.status === "completed");
  const baseCompleted = completed.filter((transaction) => transaction.currency === baseCurrency);

  const excludedCurrencyCount = [...invoices, ...transactions].filter(
    (record) => record.currency !== baseCurrency
  ).length;

  const totalReceived = baseCompleted.reduce((sum, transaction) => sum + transaction.amount, 0);

  const openInvoices = invoices.filter(isOpenInvoice);
  const baseOpen = openInvoices.filter((invoice) => invoice.currency === baseCurrency);
  const pendingAmount = baseOpen.reduce((sum, invoice) => sum + invoice.amount, 0);
  const pendingRequestCount = openInvoices.filter(
    (invoice) => invoice.kind === "payment_request"
  ).length;

  const invoiceOnly = invoices.filter((invoice) => invoice.kind === "invoice");
  const billableInvoices = invoiceOnly.filter((invoice) =>
    ["pending", "overdue", "paid"].includes(invoice.status)
  );
  const paidInvoiceCount = invoiceOnly.filter((invoice) => invoice.status === "paid").length;
  const invoiceTotal = invoiceOnly
    .filter((invoice) => invoice.currency === baseCurrency && invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const collectionRate =
    billableInvoices.length === 0 ? 0 : (paidInvoiceCount / billableInvoices.length) * 100;

  const months = lastNMonths(6, now);
  const monthly: MonthlyPoint[] = months.map((month) => {
    const received = baseCompleted
      .filter((transaction) => monthKeyFromIso(transaction.created_at) === month.key)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const pending = baseOpen
      .filter((invoice) => monthKeyFromIso(invoice.created_at) === month.key)
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const count = completed.filter(
      (transaction) => monthKeyFromIso(transaction.created_at) === month.key
    ).length;
    return { month: month.key, label: month.label, received, pending, count };
  });

  const statusBreakdown = TRANSACTION_STATUSES.map((status) => {
    const rows = transactions.filter((transaction) => transaction.status === status);
    return {
      status,
      count: rows.length,
      amount: rows
        .filter((transaction) => transaction.currency === baseCurrency)
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  });

  const customerMap = new Map<string, { name: string; amount: number; count: number }>();
  invoices
    .filter(
      (invoice) => invoice.status === "paid" && invoice.currency === baseCurrency
    )
    .forEach((invoice) => {
      const current = customerMap.get(invoice.customer_name) ?? {
        name: invoice.customer_name,
        amount: 0,
        count: 0,
      };
      current.amount += invoice.amount;
      current.count += 1;
      customerMap.set(invoice.customer_name, current);
    });

  const topCustomers = [...customerMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  return {
    baseCurrency,
    totalReceived,
    completedCount: completed.length,
    pendingAmount,
    pendingRequestCount,
    openInvoiceCount: openInvoices.length,
    paidInvoiceCount,
    invoiceTotal,
    collectionRate,
    averagePayment: completed.length === 0 ? 0 : totalReceived / baseCompleted.length || 0,
    statusBreakdown,
    monthly,
    topCustomers,
    excludedCurrencyCount,
    hasData: invoices.length > 0 || transactions.length > 0,
    hasDemoData: [...invoices, ...transactions].some((record) => record.is_demo),
  };
}

export function buildInsights(
  summary: AnalyticsSummary,
  invoices: Invoice[],
  now = new Date()
): Insight[] {
  if (!summary.hasData) {
    return [
      {
        id: "start",
        tone: "neutral",
        title: "Your ledger is waiting for its first entry",
        detail:
          "Ask the agent to create a payment request, or load demonstration data to explore every chart.",
        action: { label: "Open the agent", href: "/ai-agent" },
      },
      {
        id: "link-paypal",
        tone: "neutral",
        title: "Connect a PayPal sandbox app to collect money",
        detail:
          "Orders are created and captured on the server. The browser never decides the amount.",
        action: { label: "Check settings", href: "/settings" },
      },
    ];
  }

  const insights: Insight[] = [];
  const overdue = invoices.filter(
    (invoice) =>
      ["pending", "overdue"].includes(invoice.status) &&
      invoice.due_date &&
      (parseDateOnly(invoice.due_date)?.getTime() ?? Infinity) < now.getTime()
  );

  if (summary.pendingAmount > 0) {
    insights.push({
      id: "receivables",
      tone: overdue.length > 0 ? "warning" : "neutral",
      title: `${formatCurrency(summary.pendingAmount, summary.baseCurrency)} is still open`,
      detail:
        overdue.length > 0
          ? `${overdue.length} ${overdue.length === 1 ? "request is" : "requests are"} past due. A short reminder usually clears the oldest balance first.`
          : `Across ${summary.pendingRequestCount} payment ${summary.pendingRequestCount === 1 ? "request" : "requests"} and ${summary.openInvoiceCount} open ${summary.openInvoiceCount === 1 ? "document" : "documents"}. Nothing is overdue yet.`,
      action: { label: "Review requests", href: "/payment-requests" },
    });
  }

  const bestMonth = [...summary.monthly].sort((a, b) => b.received - a.received)[0];
  if (bestMonth && bestMonth.received > 0) {
    insights.push({
      id: "trend",
      tone: "positive",
      title: `${bestMonth.label} is your strongest month so far`,
      detail: `You collected ${formatCurrency(bestMonth.received, summary.baseCurrency)} across ${bestMonth.count} completed ${bestMonth.count === 1 ? "payment" : "payments"}.`,
      action: { label: "See the trend", href: "/analytics" },
    });
  }

  if (summary.paidInvoiceCount > 0) {
    insights.push({
      id: "collection",
      tone: summary.collectionRate >= 60 ? "positive" : "neutral",
      title: `${formatPercent(summary.collectionRate)} of invoices are paid`,
      detail:
        summary.collectionRate >= 60
          ? "Collection is healthy. Keep due dates short to protect cash flow."
          : "More than half of your invoices are still open. Ask the agent to draft a reminder.",
      action: { label: "Open invoices", href: "/invoices" },
    });
  }

  if (summary.topCustomers[0]) {
    const top = summary.topCustomers[0];
    insights.push({
      id: "customer",
      tone: "neutral",
      title: `${top.name} leads your customer list`,
      detail: `${formatCurrency(top.amount, summary.baseCurrency)} collected across ${top.count} paid ${top.count === 1 ? "invoice" : "invoices"}.`,
      action: { label: "View customers", href: "/analytics" },
    });
  }

  if (summary.excludedCurrencyCount > 0) {
    insights.push({
      id: "currency",
      tone: "neutral",
      title: `Totals use ${summary.baseCurrency}`,
      detail: `${summary.excludedCurrencyCount} records in other currencies are excluded from money totals because PayPilot never invents exchange rates.`,
    });
  }

  return insights.slice(0, 4);
}

export function buildMonthlySeries(summary: AnalyticsSummary) {
  return summary.monthly.map((point) => ({
    month: point.label,
    received: Math.round(point.received * 100) / 100,
    pending: Math.round(point.pending * 100) / 100,
    count: point.count,
  }));
}
