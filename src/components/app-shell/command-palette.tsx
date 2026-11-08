"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/format";
import { navItems } from "./nav-items";

type InvoiceHit = {
  id: string;
  invoice_number: string;
  customer_name: string;
  amount: number;
  currency: string;
  kind: string;
  is_demo: boolean;
  href: string;
};

type TransactionHit = {
  id: string;
  paypal_order_id: string | null;
  payment_description: string;
  amount: number;
  currency: string;
  status: string;
  is_demo: boolean;
  href: string;
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceHit[]>([]);
  const [transactions, setTransactions] = useState<TransactionHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          invoices?: InvoiceHit[];
          transactions?: TransactionHit[];
          error?: string;
        };
        if (!response.ok) {
          setError(payload.error ?? "Search is unavailable right now.");
          return;
        }
        setInvoices(payload.invoices ?? []);
        setTransactions(payload.transactions ?? []);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError("Search is unavailable right now.");
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  const pageMatches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return navItems.slice(0, 5);
    return navItems.filter(
      (item) =>
        item.label.toLowerCase().includes(trimmed) ||
        item.description.toLowerCase().includes(trimmed)
    );
  }, [query]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("");
      setInvoices([]);
      setTransactions([]);
      setError(null);
      setLoading(false);
    }
    onOpenChange(next);
  }

  function go(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  const searching = query.trim().length >= 2;
  const visibleInvoices = searching ? invoices : [];
  const visibleTransactions = searching ? transactions : [];
  const showLoading = searching && loading;
  const hasResults =
    visibleInvoices.length > 0 || visibleTransactions.length > 0 || pageMatches.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideClose
        className="top-[12%] max-w-xl translate-y-0 gap-0 rounded-2xl p-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Search PayPilot</DialogTitle>
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search invoices, transactions, or pages"
            className="h-14 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            aria-label="Search PayPilot"
          />
          <kbd className="hidden rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60dvh] overflow-y-auto p-2">
          {showLoading ? (
            <p className="px-3 py-4 text-xs text-slate-500">Searching your ledger...</p>
          ) : null}

          {error ? (
            <p className="px-3 py-4 text-xs text-rose-300" role="alert">
              {error}
            </p>
          ) : null}

          {pageMatches.length > 0 ? (
            <div className="py-1">
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                Pages
              </p>
              {pageMatches.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => go(item.href)}
                  className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-300">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">{item.label}</span>
                    <span className="block truncate text-xs text-slate-500">{item.description}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : null}

          {visibleInvoices.length > 0 ? (
            <div className="py-1">
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                Invoices and requests
              </p>
              {visibleInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => go(invoice.href)}
                  className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {invoice.invoice_number}
                      </span>
                      {invoice.is_demo ? (
                        <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                          Demo
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {invoice.customer_name}
                    </span>
                  </span>
                  <span className="tabular text-xs font-medium text-slate-300">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {visibleTransactions.length > 0 ? (
            <div className="py-1">
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                Transactions
              </p>
              {visibleTransactions.map((transaction) => (
                <button
                  key={transaction.id}
                  type="button"
                  onClick={() => go(transaction.href)}
                  className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {transaction.payment_description || "PayPal order"}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {transaction.paypal_order_id ?? "No order reference"}
                    </span>
                  </span>
                  <span className="tabular text-xs font-medium text-slate-300">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {!showLoading && !error && !hasResults ? (
            <div className="px-4 py-10 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-slate-600" aria-hidden="true" />
              <p className="mt-3 text-sm text-slate-400">No matches yet.</p>
              <p className="mt-1 text-xs text-slate-500">
                Try an invoice number, customer name, or PayPal order reference.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-2.5 text-[10px] text-slate-600">
          <span>Search runs against your own records only.</span>
          <span className="hidden sm:inline">Enter opens the first result you select.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
