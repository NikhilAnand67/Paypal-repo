"use client";

import Link from "next/link";
import { ArrowUpRight, CircleDollarSign, Clock3, Percent, Wallet } from "lucide-react";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { Badge } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatCurrency,
  formatPercent,
  statusLabel,
} from "@/lib/utils/format";
import type { AnalyticsSummary, Insight } from "@/types/database";

const statusTone: Record<string, string> = {
  completed: "bg-emerald-400",
  created: "bg-cyan-400",
  approved: "bg-violet-400",
  failed: "bg-rose-400",
  refunded: "bg-fuchsia-400",
};

export function AnalyticsView({
  summary,
  insights,
  databaseError,
}: {
  summary: AnalyticsSummary;
  insights: Insight[];
  databaseError?: string | null;
}) {
  const currency = summary.baseCurrency;
  const statusTotal = summary.statusBreakdown.reduce((total, item) => total + item.count, 0);
  const totalStatusCount = statusTotal || 1;
  const maxCustomer = summary.topCustomers[0]?.amount ?? 0;

  const kpis = [
    {
      label: `Collected ${currency}`,
      value: formatCurrency(summary.totalReceived, currency),
      hint: `${summary.completedCount} completed ${summary.completedCount === 1 ? "payment" : "payments"}`,
      icon: CircleDollarSign,
      tone: "text-emerald-200 bg-emerald-400/10 ring-emerald-300/20",
    },
    {
      label: "Outstanding",
      value: formatCurrency(summary.pendingAmount, currency),
      hint: `${summary.openInvoiceCount} open ${summary.openInvoiceCount === 1 ? "record" : "records"}`,
      icon: Clock3,
      tone: "text-amber-200 bg-amber-400/10 ring-amber-300/20",
    },
    {
      label: "Collection rate",
      value: formatPercent(summary.collectionRate),
      hint: `${summary.paidInvoiceCount} paid of ${
        summary.paidInvoiceCount + summary.openInvoiceCount
      } billable records`,
      icon: Percent,
      tone: "text-cyan-200 bg-cyan-400/10 ring-cyan-300/20",
    },
    {
      label: "Average payment",
      value: formatCurrency(summary.averagePayment, currency),
      hint: "Completed captures only",
      icon: Wallet,
      tone: "text-violet-200 bg-violet-500/10 ring-violet-400/20",
    },
  ];

  return (
    <div className="space-y-5">
      {databaseError === "database_not_initialized" ? (
        <p className="rounded-xl border border-amber-300/20 bg-amber-400/[0.05] px-4 py-3 text-xs leading-5 text-amber-100">
          The database schema is not applied yet, so there is nothing to analyze. Apply
          <span className="font-mono"> supabase/migrations/0001_init.sql</span> and reload.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{kpi.label}</p>
                <p className="tabular mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                  {kpi.value}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-slate-600">{kpi.hint}</p>
              </div>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${kpi.tone}`}>
                <kpi.icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {summary.excludedCurrencyCount > 0 ? (
        <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-xs leading-5 text-slate-500">
          {summary.excludedCurrencyCount}{" "}
          {summary.excludedCurrencyCount === 1 ? "record uses" : "records use"} a currency other than{" "}
          {currency}. They are excluded from money totals because PayPilot never invents exchange
          rates.
        </p>
      ) : null}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Cash flow</h2>
            <p className="mt-1 text-xs text-slate-500">
              Collected and outstanding in {currency}, last six months
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" aria-hidden="true" />
              Collected
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" aria-hidden="true" />
              Outstanding
            </span>
          </div>
        </div>
        <div className="mt-4">
          <CashflowChart data={summary.monthly} currency={currency} hasData={summary.hasData} height={320} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Payment status</h2>
              <p className="mt-1 text-xs text-slate-500">Every transaction in your ledger</p>
            </div>
            <Badge tone="neutral">{statusTotal} records</Badge>
          </div>

          {summary.statusBreakdown.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={Wallet}
                title="No transactions to group"
                description="Completed Sandbox captures will show their status distribution here."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {summary.statusBreakdown.map((item) => (
                <div key={item.status}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusTone[item.status] ?? "bg-slate-500"}`}
                        aria-hidden="true"
                      />
                      {statusLabel(item.status)}
                      <span className="text-slate-600">×{item.count}</span>
                    </span>
                    <span className="tabular font-medium text-white">
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={`h-full rounded-full ${statusTone[item.status] ?? "bg-slate-500"}`}
                      style={{ width: `${Math.max((item.count / totalStatusCount) * 100, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Top customers</h2>
              <p className="mt-1 text-xs text-slate-500">By billed amount in {currency}</p>
            </div>
            <Link
              href="/transactions"
              className="focus-ring inline-flex items-center gap-1 rounded text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              Transactions
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {summary.topCustomers.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={CircleDollarSign}
                title="No customer totals yet"
                description="Once you create invoices or requests, the highest balances are grouped here."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-3.5">
              {summary.topCustomers.map((customer, index) => (
                <div key={`${customer.name}-${index}`}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-slate-300">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/[0.05] text-[10px] font-semibold text-slate-400">
                        {index + 1}
                      </span>
                      <span className="truncate font-medium text-white">{customer.name}</span>
                    </span>
                    <span className="tabular shrink-0 text-right">
                      <span className="block font-medium text-white">
                        {formatCurrency(customer.amount, currency)}
                      </span>
                      <span className="block text-[10px] text-slate-600">
                        {customer.count} {customer.count === 1 ? "record" : "records"}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"
                      style={{ width: `${maxCustomer > 0 ? Math.max((customer.amount / maxCustomer) * 100, 4) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
        <h2 className="text-sm font-semibold text-white">What the numbers say</h2>
        <p className="mt-1 text-xs text-slate-500">Derived from your ledger, not from a forecast.</p>
        {insights.length === 0 ? (
          <p className="mt-4 text-xs text-slate-500">No observations yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      insight.tone === "positive"
                        ? "bg-emerald-400"
                        : insight.tone === "warning"
                          ? "bg-amber-400"
                          : "bg-cyan-400"
                    }`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">{insight.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">{insight.detail}</p>
                    {insight.action ? (
                      <Link
                        href={insight.action.href}
                        className="focus-ring mt-2 inline-flex items-center gap-1 rounded text-[11px] font-medium text-cyan-300 hover:text-cyan-200"
                      >
                        {insight.action.label}
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
