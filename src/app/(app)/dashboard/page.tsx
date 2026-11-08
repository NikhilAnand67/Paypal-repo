import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FilePlus2,
  HandCoins,
  Percent,
  Sparkles,
  Wallet,
} from "lucide-react";
import { requireUser, displayName } from "@/lib/auth/account";
import { getWorkspace } from "@/lib/data/workspace";
import { formatCurrency, formatPercent, greetingForHour } from "@/lib/utils/format";
import { dueDateLabel, isPastDue } from "@/lib/utils/dates";
import { PageHeader } from "@/components/dashboard/page-header";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { DatabaseNotice } from "@/components/dashboard/database-notice";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/status-pill";
import type { Currency } from "@/types/database";

export const metadata: Metadata = {
  title: "Overview",
  description: "Your collected totals, outstanding balance, and agent insights in one place.",
};

export default async function DashboardPage() {
  const account = await requireUser();
  const user = account.user!;
  const currency = (account.profile?.currency ?? "USD") as Currency;
  const workspace = await getWorkspace(account.supabase, user.id, currency);
  const { summary, insights, invoices, transactions } = workspace;

  const name = displayName(user, account.profile);
  const firstName = name.split(" ")[0];
  const greeting = greetingForHour(new Date().getHours());

  const openDocuments = invoices
    .filter((invoice) => ["draft", "pending", "overdue"].includes(invoice.status))
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 4);

  const quickActions = [
    {
      href: "/ai-agent",
      label: "Ask the agent",
      copy: "Prepare the next financial action",
      icon: Sparkles,
      tone: "text-violet-200 bg-violet-500/10 ring-violet-400/20",
    },
    {
      href: "/invoices?new=1",
      label: "Create an invoice",
      copy: "Draft and save a billable record",
      icon: FilePlus2,
      tone: "text-cyan-200 bg-cyan-400/10 ring-cyan-300/20",
    },
    {
      href: "/payment-requests?new=1",
      label: "Request a payment",
      copy: "Collect through PayPal Sandbox",
      icon: HandCoins,
      tone: "text-emerald-200 bg-emerald-400/10 ring-emerald-300/20",
    },
    {
      href: "/analytics",
      label: "Review analytics",
      copy: "Understand the month at a glance",
      icon: BarChart3,
      tone: "text-amber-200 bg-amber-400/10 ring-amber-300/20",
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Overview"
        title={`${greeting}, ${firstName}`}
        description="Here is the shape of your money right now, read directly from your own ledger."
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href="/invoices?new=1">
                <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
                New invoice
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/ai-agent">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Ask the agent
              </Link>
            </Button>
          </>
        }
      />

      {workspace.error === "database_not_initialized" ? <DatabaseNotice /> : null}

      <DemoBanner hasDemoData={summary.hasDemoData} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Collected ${summary.baseCurrency}`}
          value={formatCurrency(summary.totalReceived, summary.baseCurrency)}
          hint={`${summary.completedCount} completed ${summary.completedCount === 1 ? "payment" : "payments"} in this currency`}
          detail="Only completed PayPal captures in your base currency are counted. Other currencies are excluded rather than converted with an invented rate."
          icon={CircleDollarSign}
          tone="emerald"
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrency(summary.pendingAmount, summary.baseCurrency)}
          hint={`${summary.openInvoiceCount} open ${summary.openInvoiceCount === 1 ? "document" : "documents"} across invoices and requests`}
          detail="Draft, pending, and overdue invoices or payment requests still awaiting settlement."
          icon={Clock3}
          tone="amber"
        />
        <KpiCard
          label="Collection rate"
          value={formatPercent(summary.collectionRate)}
          hint={`${summary.paidInvoiceCount} paid of ${summary.paidInvoiceCount + summary.openInvoiceCount} billable records`}
          detail="Paid billable records divided by all billable records, calculated from stored statuses."
          icon={Percent}
          tone="cyan"
          progress={summary.collectionRate}
        />
        <KpiCard
          label="Average payment"
          value={formatCurrency(summary.averagePayment, summary.baseCurrency)}
          hint="Completed captures only, never estimated"
          detail="Completed captures divided by the number of completed payments. No projection or estimate is applied."
          icon={Wallet}
          tone="violet"
        />
      </div>

      {summary.excludedCurrencyCount > 0 ? (
        <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-xs leading-5 text-slate-500">
          {summary.excludedCurrencyCount} {summary.excludedCurrencyCount === 1 ? "record uses" : "records use"} a
          currency other than {summary.baseCurrency}. They are excluded from money totals because
          PayPilot never invents exchange rates.
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-5">
          <div className="premium-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Cash flow</h2>
                <p className="mt-1 text-xs text-slate-500">Collected and outstanding, last six months</p>
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
                <Link
                  href="/analytics"
                  className="focus-ring rounded font-medium text-cyan-300 transition-colors hover:text-cyan-200"
                >
                  Details
                </Link>
              </div>
            </div>
            <div className="mt-4">
              <CashflowChart
                data={summary.monthly}
                currency={summary.baseCurrency}
                hasData={summary.hasData}
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent transactions</h2>
              <Link
                href="/transactions"
                className="focus-ring inline-flex items-center gap-1 rounded text-xs font-medium text-slate-400 transition-colors hover:text-white"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <TransactionTable
              transactions={transactions.slice(0, 6)}
              invoices={invoices}
              emptyDescription="Once a PayPal Sandbox order is captured, it will appear here with its verified amount."
              emptyAction={
                <Button asChild variant="secondary" size="sm">
                  <Link href="/ai-agent">Ask the agent to prepare a request</Link>
                </Button>
              }
            />
          </div>
        </div>

        <div className="space-y-5">
          <InsightsCard insights={insights} />

          <div className="premium-panel rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Open documents</h2>
              <Badge tone="neutral">{openDocuments.length} shown</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">The balances closest to their due date.</p>

            <div className="mt-4 space-y-2">
              {openDocuments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/[0.09] px-4 py-6 text-center">
                  <p className="text-xs font-medium text-slate-300">Nothing is open</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Every invoice and request in this ledger has been settled or closed.
                  </p>
                </div>
              ) : (
                openDocuments.map((invoice) => {
                  const overdue = invoice.status !== "draft" && isPastDue(invoice.due_date);
                  return (
                    <Link
                      key={invoice.id}
                      href={`/${invoice.kind === "invoice" ? "invoices" : "payment-requests"}?highlight=${invoice.id}`}
                      className="focus-ring block rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-white">
                          {invoice.customer_name}
                        </span>
                        <span className="tabular shrink-0 text-xs font-semibold text-white">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                          <CalendarClock className="h-3 w-3" aria-hidden="true" />
                          {invoice.due_date ? dueDateLabel(invoice.due_date) : "No due date"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {invoice.is_demo ? (
                            <span className="rounded bg-amber-400/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-200">
                              Demo
                            </span>
                          ) : null}
                          <StatusPill status={overdue ? "overdue" : invoice.status} />
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="premium-panel rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white">Quick actions</h2>
            <div className="mt-4 grid gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="focus-ring flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${action.tone}`}
                  >
                    <action.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-white">{action.label}</span>
                    <span className="block truncate text-[11px] text-slate-500">{action.copy}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
