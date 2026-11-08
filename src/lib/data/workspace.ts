import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAnalytics, buildInsights } from "@/lib/data/analytics";
import { isDatabaseSetupError } from "@/lib/security/http";
import type {
  AgentSnapshot,
  AnalyticsSummary,
  AppNotification,
  AuditLog,
  Currency,
  Database,
  Insight,
  Invoice,
  Transaction,
} from "@/types/database";

export type Ledger = {
  invoices: Invoice[];
  transactions: Transaction[];
  error: string | null;
};

export async function getLedger(
  supabase: SupabaseClient<Database>,
  userId: string,
  limits: { invoices?: number; transactions?: number } = {}
): Promise<Ledger> {
  const [invoicesResult, transactionsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limits.invoices ?? 500),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limits.transactions ?? 500),
  ]);

  if (invoicesResult.error || transactionsResult.error) {
    const error = invoicesResult.error ?? transactionsResult.error;
    return {
      invoices: [],
      transactions: [],
      error: isDatabaseSetupError(error) ? "database_not_initialized" : "ledger_unavailable",
    };
  }

  return {
    invoices: (invoicesResult.data ?? []) as Invoice[],
    transactions: (transactionsResult.data ?? []) as Transaction[],
    error: null,
  };
}

export type WorkspaceData = Ledger & {
  summary: AnalyticsSummary;
  insights: Insight[];
  notifications: AppNotification[];
  unreadCount: number;
};

export async function getWorkspace(
  supabase: SupabaseClient<Database>,
  userId: string,
  currency: Currency
): Promise<WorkspaceData> {
  const [ledger, notificationsResult] = await Promise.all([
    getLedger(supabase, userId),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const notifications = notificationsResult.error
    ? []
    : ((notificationsResult.data ?? []) as AppNotification[]);

  const summary = buildAnalytics(ledger.invoices, ledger.transactions, currency);
  const insights = buildInsights(summary, ledger.invoices);

  return {
    ...ledger,
    summary,
    insights,
    notifications,
    unreadCount: notifications.filter((notification) => !notification.is_read).length,
  };
}

export async function getNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 100
) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return {
    notifications: (data ?? []) as AppNotification[],
    error: isDatabaseSetupError(error) ? "database_not_initialized" : error ? "notifications_unavailable" : null,
  };
}

export async function getSecurityActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 12
) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return {
    logs: (data ?? []) as AuditLog[],
    error: error ? "activity_unavailable" : null,
  };
}

/**
 * A compact, authorization scoped snapshot for the agent. It contains only the
 * signed in user's own records and never includes credentials.
 */
export async function getAgentSnapshot(
  supabase: SupabaseClient<Database>,
  userId: string,
  currency: Currency
): Promise<{ snapshot: AgentSnapshot; summary: AnalyticsSummary; invoices: Invoice[]; error: string | null }> {
  const ledger = await getLedger(supabase, userId, { invoices: 300, transactions: 300 });
  const summary = buildAnalytics(ledger.invoices, ledger.transactions, currency);

  const snapshot: AgentSnapshot = {
    generated_at: new Date().toISOString(),
    base_currency: summary.baseCurrency,
    totals: {
      received: summary.totalReceived,
      outstanding: summary.pendingAmount,
      completed_payments: summary.completedCount,
      open_documents: summary.openInvoiceCount,
      paid_invoices: summary.paidInvoiceCount,
      collection_rate: Math.round(summary.collectionRate),
    },
    monthly: summary.monthly.map((point) => ({
      month: point.label,
      received: point.received,
      outstanding: point.pending,
      count: point.count,
    })),
    invoices: ledger.invoices.slice(0, 24).map((invoice) => ({
      id: invoice.id,
      type: invoice.kind,
      number: invoice.invoice_number,
      customer: invoice.customer_name,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      status: invoice.status,
      due_date: invoice.due_date,
      demo: invoice.is_demo,
    })),
    recent_transactions: ledger.transactions.slice(0, 12).map((transaction) => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.payment_description,
      created_at: transaction.created_at,
      demo: transaction.is_demo,
    })),
    demo_data_present: summary.hasDemoData,
  };

  return { snapshot, summary, invoices: ledger.invoices, error: ledger.error };
}
