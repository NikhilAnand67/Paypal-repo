import Link from "next/link";
import { ArrowUpRight, Receipt } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate, truncateMiddle } from "@/lib/utils/format";
import type { Invoice, Transaction } from "@/types/database";
import { cn } from "@/lib/utils/cn";

function invoiceLookup(invoices: Invoice[]) {
  return new Map(invoices.map((invoice) => [invoice.id, invoice]));
}

export function TransactionTable({
  transactions,
  invoices,
  highlight,
  emptyTitle = "No transactions yet",
  emptyDescription = "Completed PayPal Sandbox captures will appear here. Nothing is simulated on this page.",
  emptyAction,
}: {
  transactions: Transaction[];
  invoices: Invoice[];
  highlight?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const lookup = invoiceLookup(invoices);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-500">
              <th className="px-4 py-3 font-medium sm:px-5">Transaction</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Invoice</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium sm:px-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.045]">
            {transactions.map((transaction) => {
              const invoice = transaction.invoice_id ? lookup.get(transaction.invoice_id) : null;
              const isHighlighted = highlight === transaction.id;
              return (
                <tr
                  key={transaction.id}
                  className={cn(
                    "group transition-colors hover:bg-white/[0.03]",
                    isHighlighted && "bg-violet-500/[0.07]"
                  )}
                >
                  <td className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400">
                        <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="max-w-[220px] truncate text-sm font-medium text-white">
                            {transaction.payment_description || "PayPal payment"}
                          </p>
                          {transaction.is_demo ? (
                            <span className="shrink-0 rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                              Demo
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                          {transaction.paypal_order_id
                            ? truncateMiddle(transaction.paypal_order_id, 10, 6)
                            : "No order reference"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3.5 md:table-cell">
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
                  <td className="px-4 py-3.5 text-right sm:px-5">
                    <StatusPill status={transaction.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
