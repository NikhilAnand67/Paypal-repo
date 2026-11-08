"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Copy, Receipt, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, StatusPill } from "@/components/ui/status-pill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, formatDateTime, truncateMiddle } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Currency, Invoice, Transaction } from "@/types/database";

type StatusFilter = "all" | "completed" | "created" | "approved" | "failed" | "refunded";

const numeric = (value: number | string) => (typeof value === "string" ? Number(value) : value);

export function TransactionsView({
  transactions,
  invoices,
  baseCurrency,
  highlight,
  databaseError,
}: {
  transactions: Transaction[];
  invoices: Invoice[];
  baseCurrency: Currency;
  highlight?: string;
  databaseError?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [detail, setDetail] = useState<Transaction | null>(null);

  const invoiceLookup = useMemo(
    () => new Map(invoices.map((invoice) => [invoice.id, invoice])),
    [invoices]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        (transaction.payment_description ?? "").toLowerCase().includes(needle) ||
        (transaction.paypal_order_id ?? "").toLowerCase().includes(needle) ||
        (transaction.paypal_capture_id ?? "").toLowerCase().includes(needle)
      );
    });
  }, [query, statusFilter, transactions]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        const amount = numeric(transaction.amount);
        if (transaction.status === "completed") {
          acc.completedCount += 1;
          if (transaction.currency === baseCurrency) acc.completedTotal += amount;
          else acc.excluded += 1;
        }
        if (transaction.status === "failed") acc.failedCount += 1;
        if (transaction.status === "created" || transaction.status === "approved") {
          acc.pendingCount += 1;
        }
        return acc;
      },
      { completedCount: 0, completedTotal: 0, failedCount: 0, pendingCount: 0, excluded: 0 }
    );
  }, [baseCurrency, transactions]);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Clipboard access is unavailable in this browser.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: `Completed ${baseCurrency}`,
            value: formatCurrency(summary.completedTotal, baseCurrency),
            hint: `${summary.completedCount} verified ${summary.completedCount === 1 ? "capture" : "captures"}`,
            tone: "text-emerald-200",
          },
          {
            label: "In progress",
            value: String(summary.pendingCount),
            hint: "Created or approved orders",
            tone: "text-cyan-200",
          },
          {
            label: "Failed",
            value: String(summary.failedCount),
            hint: "No money moved",
            tone: "text-rose-200",
          },
          {
            label: "Records",
            value: String(transactions.length),
            hint: summary.excluded > 0 ? `${summary.excluded} outside ${baseCurrency}` : "All in your base currency",
            tone: "text-slate-200",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5"
          >
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{stat.label}</p>
            <p className={`tabular mt-1.5 text-xl font-semibold ${stat.tone}`}>{stat.value}</p>
            <p className="mt-1 text-[10px] text-slate-600">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search description, order ID, or capture ID"
            className="pl-9"
            aria-label="Search transactions"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="w-full sm:w-44"
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="created">Created</option>
          <option value="approved">Approved</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </Select>
      </div>

      {databaseError === "database_not_initialized" ? (
        <p className="rounded-xl border border-amber-300/20 bg-amber-400/[0.05] px-4 py-3 text-xs leading-5 text-amber-100">
          The database schema is not applied yet, so no transactions can be shown. Apply
          <span className="font-mono"> supabase/migrations/0001_init.sql</span> and reload.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={transactions.length === 0 ? "No transactions yet" : "No transactions match those filters"}
          description={
            transactions.length === 0
              ? "Only real PayPal Sandbox captures appear here. Nothing is fabricated and demo seed data never creates transactions."
              : "Clear the search or choose another status to see the rest of your ledger."
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-5 py-3 font-medium">Transaction</th>
                    <th className="px-4 py-3 font-medium">Record</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-right font-medium">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.045]">
                  {filtered.map((transaction) => {
                    const invoice = transaction.invoice_id
                      ? invoiceLookup.get(transaction.invoice_id)
                      : null;
                    return (
                      <tr
                        key={transaction.id}
                        className={cn(
                          "group transition-colors hover:bg-white/[0.03]",
                          highlight === transaction.id && "bg-violet-500/[0.07]"
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400">
                              <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="max-w-[240px] truncate text-sm font-medium text-white">
                                  {transaction.payment_description || "PayPal payment"}
                                </p>
                                {transaction.is_demo ? (
                                  <span className="shrink-0 rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                                    Demo
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                                {transaction.paypal_capture_id
                                  ? truncateMiddle(transaction.paypal_capture_id, 12, 6)
                                  : transaction.paypal_order_id
                                    ? truncateMiddle(transaction.paypal_order_id, 10, 6)
                                    : "No PayPal reference"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {invoice ? (
                            <Link
                              href={`/${invoice.kind === "invoice" ? "invoices" : "payment-requests"}?highlight=${invoice.id}`}
                              className="focus-ring inline-flex items-center gap-1 rounded text-xs font-medium text-slate-300 transition-colors hover:text-cyan-300"
                            >
                              {invoice.invoice_number}
                              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-600">Not linked</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">
                          {formatDate(transaction.created_at)}
                        </td>
                        <td className="tabular whitespace-nowrap px-4 py-3.5 text-right text-sm font-medium text-white">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <StatusPill status={transaction.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setDetail(transaction)}
                            className="focus-ring rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:text-white"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2 md:hidden">
            {filtered.map((transaction) => (
              <button
                key={transaction.id}
                type="button"
                onClick={() => setDetail(transaction)}
                className="focus-ring block w-full rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-left transition-colors hover:border-white/[0.14]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {transaction.payment_description || "PayPal payment"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {formatDate(transaction.created_at)}
                      {transaction.is_demo ? " · Demo data" : ""}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-sm font-semibold text-white">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusPill status={transaction.status} />
                  <span className="font-mono text-[10px] text-slate-500">
                    {transaction.paypal_order_id
                      ? truncateMiddle(transaction.paypal_order_id, 8, 5)
                      : "No reference"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="max-w-xl">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{detail.payment_description || "PayPal payment"}</DialogTitle>
                  <StatusPill status={detail.status} />
                  {detail.is_demo ? <Badge tone="amber">Demo</Badge> : null}
                </div>
                <DialogDescription>
                  Recorded {formatDateTime(detail.created_at)} from PayPal Sandbox.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="tabular text-2xl font-semibold tracking-[-0.03em] text-white">
                  {formatCurrency(detail.amount, detail.currency)}
                </p>
                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  {(
                    [
                      ["Order ID", detail.paypal_order_id],
                      ["Capture ID", detail.paypal_capture_id],
                      ["Payer ID", detail.paypal_payer_id],
                      ["Provider", detail.payment_provider],
                    ] as [string, string | null][]
                  ).map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="mt-1 flex items-center gap-1.5">
                        <span className="truncate font-mono text-[11px] text-slate-300">
                          {value || "Not available"}
                        </span>
                        {value ? (
                          <button
                            type="button"
                            onClick={() => void copy(value ?? "", label)}
                            className="focus-ring shrink-0 rounded p-0.5 text-slate-500 hover:text-white"
                            aria-label={`Copy ${label}`}
                          >
                            <Copy className="h-3 w-3" aria-hidden="true" />
                          </button>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {detail.failure_reason ? (
                <p className="rounded-xl border border-rose-300/20 bg-rose-400/[0.06] px-4 py-3 text-xs leading-5 text-rose-100">
                  {detail.failure_reason}
                </p>
              ) : null}

              {detail.invoice_id && invoiceLookup.get(detail.invoice_id) ? (
                <Link
                  href={`/${invoiceLookup.get(detail.invoice_id)!.kind === "invoice" ? "invoices" : "payment-requests"}?highlight=${detail.invoice_id}`}
                  className="focus-ring inline-flex items-center gap-1.5 rounded text-xs font-medium text-cyan-300 hover:text-cyan-200"
                >
                  Open {invoiceLookup.get(detail.invoice_id)!.invoice_number}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}

              <p className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/80" aria-hidden="true" />
                Amounts here are stored from the verified PayPal capture, never entered by the
                browser.
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
