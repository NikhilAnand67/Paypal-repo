"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  FileDown,
  FileText,
  HandCoins,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Badge, StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/primitives";
import { InvoiceDialog } from "./invoice-dialog";
import { PaypalCheckoutDialog } from "@/components/paypal/paypal-checkout";
import { formatDate, formatDateTime, formatCurrency, truncateMiddle } from "@/lib/utils/format";
import { dueDateLabel, isPastDue } from "@/lib/utils/dates";
import type { Currency, Invoice, InvoiceKind } from "@/types/database";
import { cn } from "@/lib/utils/cn";

type StatusFilter = "all" | "open" | "paid" | "cancelled";

function effectiveStatus(invoice: Invoice) {
  if (invoice.status === "pending" && isPastDue(invoice.due_date)) return "overdue";
  return invoice.status;
}

function matchesStatus(invoice: Invoice, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "open") return ["draft", "pending", "overdue"].includes(effectiveStatus(invoice));
  return invoice.status === filter;
}

function reminderPrompt(invoice: Invoice) {
  const recipient = invoice.customer_email ? ` to ${invoice.customer_email}` : "";
  return `Send a reminder for ${invoice.invoice_number} for ${formatCurrency(invoice.amount, invoice.currency)}${recipient}.`;
}

export function InvoicesView({
  kind,
  invoices,
  defaultCurrency,
  paypalClientId,
  initialNew = false,
  highlight,
  databaseError,
}: {
  kind: InvoiceKind;
  invoices: Invoice[];
  defaultCurrency: Currency;
  paypalClientId: string | null;
  initialNew?: boolean;
  highlight?: string;
  databaseError?: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(initialNew);
  const [dialogInvoice, setDialogInvoice] = useState<Invoice | null>(null);
  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const highlightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!highlight || !highlightRef.current) return;
    const timer = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    return () => clearTimeout(timer);
  }, [highlight]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (!matchesStatus(invoice, statusFilter)) return false;
      if (!needle) return true;
      return (
        invoice.customer_name.toLowerCase().includes(needle) ||
        invoice.invoice_number.toLowerCase().includes(needle) ||
        invoice.description.toLowerCase().includes(needle) ||
        (invoice.customer_email ?? "").toLowerCase().includes(needle)
      );
    });
  }, [invoices, query, statusFilter]);

  const counts = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        const status = effectiveStatus(invoice);
        if (status === "overdue") acc.overdue += 1;
        if (["draft", "pending", "overdue"].includes(status)) acc.open += 1;
        if (status === "paid") acc.paid += 1;
        if (status === "draft") acc.draft += 1;
        return acc;
      },
      { open: 0, overdue: 0, paid: 0, draft: 0 }
    );
  }, [invoices]);

  function refresh() {
    router.refresh();
    window.dispatchEvent(new Event("paypilot:notifications-updated"));
  }

  function openNew() {
    setDialogInvoice(null);
    setDialogOpen(true);
  }

  function openEdit(invoice: Invoice) {
    setDialogInvoice(invoice);
    setDialogOpen(true);
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/invoices/${deleteTarget.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "The record could not be deleted.");
        return;
      }
      toast.success("Record deleted.");
      setDeleteTarget(null);
      refresh();
    } catch {
      toast.error("The record could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  const noun = kind === "invoice" ? "invoice" : "payment request";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Open", value: counts.open, tone: "text-amber-200" },
          { label: "Overdue", value: counts.overdue, tone: "text-rose-200" },
          { label: "Paid", value: counts.paid, tone: "text-emerald-200" },
          { label: "Drafts", value: counts.draft, tone: "text-slate-300" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5"
          >
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{stat.label}</p>
            <p className={`tabular mt-1.5 text-xl font-semibold ${stat.tone}`}>{stat.value}</p>
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
            placeholder={`Search ${noun}s by customer, number, or description`}
            className="pl-9"
            aria-label={`Search ${noun}s`}
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            aria-label="Filter by status"
            className="w-full sm:w-40"
          >
            <option value="all">All statuses</option>
            <option value="open">Open only</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Button type="button" onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New
          </Button>
        </div>
      </div>

      {databaseError === "database_not_initialized" ? (
        <p className="rounded-xl border border-amber-300/20 bg-amber-400/[0.05] px-4 py-3 text-xs leading-5 text-amber-100">
          The database schema is not applied yet, so this list is empty. Apply
          <span className="font-mono"> supabase/migrations/0001_init.sql</span> and reload.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={kind === "invoice" ? FileText : HandCoins}
          title={
            invoices.length === 0
              ? `No ${noun}s yet`
              : `No ${noun}s match those filters`
          }
          description={
            invoices.length === 0
              ? kind === "invoice"
                ? "Create a draft yourself, or ask the agent to prepare one from a plain language request."
                : "Create a request manually, or ask the agent to prepare one and wait for your confirmation."
              : "Try a different search term or status filter."
          }
          action={
            invoices.length === 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" onClick={openNew}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New {noun}
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/ai-agent">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Ask the agent
                  </Link>
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                Reset filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-4 py-3 font-medium lg:px-5">Customer</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-right font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium lg:px-5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.045]">
                  {filtered.map((invoice) => {
                    const isHighlighted = highlight === invoice.id;
                    const status = effectiveStatus(invoice);
                    return (
                      <tr
                        key={invoice.id}
                        ref={isHighlighted ? (node) => { highlightRef.current = node; } : undefined}
                        className={cn(
                          "transition-colors hover:bg-white/[0.03]",
                          isHighlighted && "bg-violet-500/[0.07]"
                        )}
                      >
                        <td className="px-4 py-3.5 lg:px-5">
                          <button
                            type="button"
                            onClick={() => setDetailInvoice(invoice)}
                            className="focus-ring block max-w-[280px] truncate rounded text-left text-sm font-medium text-white hover:text-cyan-200"
                          >
                            {invoice.customer_name}
                          </button>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-500">
                              {invoice.invoice_number}
                            </span>
                            {invoice.is_demo ? (
                              <span className="rounded bg-amber-400/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-200">
                                Demo
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">
                          {invoice.due_date ? dueDateLabel(invoice.due_date) : "No due date"}
                        </td>
                        <td className="tabular whitespace-nowrap px-4 py-3.5 text-right text-sm font-medium text-white">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <StatusPill status={status} />
                        </td>
                        <td className="px-4 py-3.5 text-right lg:px-5">
                          <div className="flex items-center justify-end gap-1">
                            {["draft", "pending", "overdue"].includes(status) ? (
                              <Button
                                type="button"
                                variant="cyan"
                                size="sm"
                                onClick={() => setCheckoutInvoice(invoice)}
                              >
                                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                                Collect
                              </Button>
                            ) : null}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="iconSm"
                                  aria-label={`Actions for ${invoice.invoice_number}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setDetailInvoice(invoice)}>
                                  <FileText className="h-4 w-4 text-slate-500" aria-hidden="true" />
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={invoice.status === "paid"}
                                  onSelect={() => openEdit(invoice)}
                                >
                                  <Pencil className="h-4 w-4 text-slate-500" aria-hidden="true" />
                                  Edit record
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`/api/invoices/${invoice.id}/pdf`}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                  >
                                    <FileDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
                                    Download PDF
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/ai-agent?prompt=${encodeURIComponent(reminderPrompt(invoice))}`}
                                  >
                                    <BellRing className="h-4 w-4 text-slate-500" aria-hidden="true" />
                                    Prepare a reminder
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={invoice.status === "paid"}
                                  onSelect={() => setDeleteTarget(invoice)}
                                  className="text-rose-200 data-[highlighted]:bg-rose-500/10 data-[highlighted]:text-rose-100"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  Delete record
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2.5 md:hidden">
            {filtered.map((invoice) => {
              const isHighlighted = highlight === invoice.id;
              const status = effectiveStatus(invoice);
              return (
                <div
                  key={invoice.id}
                  ref={isHighlighted ? (node) => { highlightRef.current = node; } : undefined}
                  className={cn(
                    "rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4",
                    isHighlighted && "ring-1 ring-violet-400/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{invoice.customer_name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-500">
                          {invoice.invoice_number}
                        </span>
                        {invoice.is_demo ? (
                          <span className="rounded bg-amber-400/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-200">
                            Demo
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <StatusPill status={status} />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="tabular text-xl font-semibold text-white">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {invoice.due_date ? dueDateLabel(invoice.due_date) : "No due date"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {["draft", "pending", "overdue"].includes(status) ? (
                        <Button
                          type="button"
                          variant="cyan"
                          size="sm"
                          onClick={() => setCheckoutInvoice(invoice)}
                        >
                          <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                          Collect
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setDetailInvoice(invoice)}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <InvoiceDialog
        key={dialogInvoice?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogInvoice(null);
        }}
        kind={kind}
        invoice={dialogInvoice}
        defaultCurrency={defaultCurrency}
        onSaved={refresh}
      />

      <PaypalCheckoutDialog
        invoice={checkoutInvoice}
        open={Boolean(checkoutInvoice)}
        onOpenChange={(open) => {
          if (!open) setCheckoutInvoice(null);
        }}
        clientId={paypalClientId}
        onCompleted={refresh}
      />

      <Dialog
        open={Boolean(detailInvoice)}
        onOpenChange={(open) => {
          if (!open) setDetailInvoice(null);
        }}
      >
        <DialogContent className="max-w-xl">
          {detailInvoice ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{detailInvoice.customer_name}</DialogTitle>
                  <StatusPill status={effectiveStatus(detailInvoice)} />
                  {detailInvoice.is_demo ? <Badge tone="amber">Demo</Badge> : null}
                </div>
                <DialogDescription>
                  {kind === "invoice" ? "Invoice" : "Payment request"}{" "}
                  <span className="font-mono text-xs">{detailInvoice.invoice_number}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="tabular text-2xl font-semibold tracking-[-0.03em] text-white">
                  {formatCurrency(detailInvoice.amount, detailInvoice.currency)}
                </p>
                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Customer email</dt>
                    <dd className="mt-1 break-all text-slate-300">
                      {detailInvoice.customer_email || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Due date</dt>
                    <dd className="mt-1 text-slate-300">
                      {detailInvoice.due_date ? formatDate(detailInvoice.due_date) : "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Created</dt>
                    <dd className="mt-1 text-slate-300">{formatDateTime(detailInvoice.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">PayPal order</dt>
                    <dd className="mt-1 font-mono text-[11px] text-slate-300">
                      {detailInvoice.paypal_order_id
                        ? truncateMiddle(detailInvoice.paypal_order_id, 10, 6)
                        : "No order yet"}
                    </dd>
                  </div>
                </dl>
              </div>

              {detailInvoice.description ? (
                <div>
                  <p className="text-xs font-medium text-slate-500">Description</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-300">
                    {detailInvoice.description}
                  </p>
                </div>
              ) : null}

              {detailInvoice.notes ? (
                <div>
                  <p className="text-xs font-medium text-slate-500">Internal notes</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-400">
                    {detailInvoice.notes}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {["draft", "pending", "overdue"].includes(effectiveStatus(detailInvoice)) ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setCheckoutInvoice(detailInvoice);
                      setDetailInvoice(null);
                    }}
                  >
                    <Wallet className="h-4 w-4" aria-hidden="true" />
                    Collect with PayPal
                  </Button>
                ) : null}
                <Button asChild variant="secondary">
                  <a
                    href={`/api/invoices/${detailInvoice.id}/pdf`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <FileDown className="h-4 w-4" aria-hidden="true" />
                    Download PDF
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={detailInvoice.status === "paid"}
                  onClick={() => {
                    openEdit(detailInvoice);
                    setDetailInvoice(null);
                  }}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this record?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `${deleteTarget.invoice_number} for ${deleteTarget.customer_name} will be removed. Any unfinished PayPal attempt linked to it will be marked failed. Paid records cannot be deleted.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep record
            </Button>
            <Button type="button" variant="danger" onClick={remove} disabled={deleting}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {deleting ? "Deleting..." : "Delete record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
