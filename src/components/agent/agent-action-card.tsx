"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  ExternalLink,
  FileText,
  HandCoins,
  Loader2,
  ShieldCheck,
  ShieldQuestion,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/status-pill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CURRENCIES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type {
  AgentActionPayload,
  AgentExecutionStatus,
  AgentResultSummary,
  Currency,
} from "@/types/database";

export type ActionOverrides = {
  amount?: number;
  currency?: Currency;
  customer_name?: string;
  customer_email?: string;
  description?: string;
  due_date?: string;
};

const actionMeta: Record<
  AgentActionPayload["type"],
  { title: string; icon: typeof FileText; tone: string }
> = {
  create_invoice: {
    title: "Invoice draft",
    icon: FileText,
    tone: "text-cyan-200 bg-cyan-400/10 ring-cyan-300/20",
  },
  create_payment_request: {
    title: "Payment request",
    icon: HandCoins,
    tone: "text-emerald-200 bg-emerald-400/10 ring-emerald-300/20",
  },
  send_reminder: {
    title: "Reminder email",
    icon: BellRing,
    tone: "text-amber-200 bg-amber-400/10 ring-amber-300/20",
  },
  collect_payment: {
    title: "PayPal Sandbox checkout",
    icon: Wallet,
    tone: "text-violet-200 bg-violet-500/10 ring-violet-400/20",
  },
};

function statusCopy(status: AgentExecutionStatus | "none") {
  switch (status) {
    case "executed":
      return { label: "Executed", tone: "emerald" as const };
    case "declined":
      return { label: "Declined", tone: "neutral" as const };
    case "expired":
      return { label: "Expired", tone: "neutral" as const };
    case "failed":
      return { label: "Failed", tone: "rose" as const };
    case "pending_confirmation":
      return { label: "Waiting for you", tone: "amber" as const };
    default:
      return { label: "Preview", tone: "violet" as const };
  }
}

export function AgentActionCard({
  payload,
  status,
  result,
  error,
  busy,
  onConfirm,
  onDecline,
}: {
  payload: AgentActionPayload;
  status: AgentExecutionStatus | "none";
  result?: AgentResultSummary | null;
  error?: string | null;
  busy?: boolean;
  onConfirm: (overrides: ActionOverrides) => Promise<void> | void;
  onDecline: () => Promise<void> | void;
}) {
  const meta = actionMeta[payload.type];
  const Icon = meta.icon;
  const pending = status === "pending_confirmation";
  const badge = statusCopy(status);

  const [amount, setAmount] = useState(
    payload.amount === null || payload.amount === undefined ? "" : String(payload.amount)
  );
  const [currency, setCurrency] = useState<Currency>(payload.currency ?? "USD");
  const [customerName, setCustomerName] = useState(payload.customer_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(payload.customer_email ?? "");
  const [description, setDescription] = useState(payload.description ?? "");
  const [dueDate, setDueDate] = useState(payload.due_date ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const numericAmount = Number(amount);
  const amountValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const emailValid =
    customerEmail.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());

  const overrides = useMemo<ActionOverrides>(() => {
    const next: ActionOverrides = {
      currency,
      customer_email: customerEmail.trim(),
      description,
    };
    if (amount.trim() !== "" && amountValid) next.amount = numericAmount;
    if (customerName.trim()) next.customer_name = customerName.trim();
    if (dueDate) next.due_date = dueDate;
    return next;
  }, [amount, amountValid, currency, customerEmail, customerName, description, dueDate, numericAmount]);

  const summary = useMemo(() => {
    if (payload.type === "create_invoice" || payload.type === "create_payment_request") {
      return [
        { label: "Customer", value: customerName.trim() || "Not set" },
        { label: "Amount", value: amountValid ? formatCurrency(numericAmount, currency) : "Not set" },
        { label: "Due", value: dueDate ? formatDate(dueDate) : "No due date" },
        { label: "Email", value: customerEmail.trim() || "Not provided" },
      ];
    }
    if (payload.type === "send_reminder") {
      return [
        { label: "Record", value: payload.invoice_number ?? "Selected record" },
        { label: "Send to", value: customerEmail.trim() || "Customer email required" },
      ];
    }
    return [
      { label: "Record", value: payload.invoice_number ?? "Selected record" },
      {
        label: "Amount",
        value: amountValid ? formatCurrency(numericAmount, currency) : "Read from the record",
      },
    ];
  }, [amountValid, currency, customerEmail, customerName, dueDate, numericAmount, payload]);

  function requestConfirmation() {
    if (payload.type === "send_reminder" && customerEmail.trim().length === 0) {
      setLocalError("Add the customer email before sending a reminder.");
      return;
    }
    if (
      (payload.type === "create_invoice" || payload.type === "create_payment_request") &&
      !amountValid
    ) {
      setLocalError("Enter an amount greater than zero.");
      return;
    }
    if (!emailValid) {
      setLocalError("Enter a valid customer email or leave it blank.");
      return;
    }
    setLocalError(null);
    setConfirmOpen(true);
  }

  async function confirm() {
    setConfirmOpen(false);
    await onConfirm(overrides);
  }

  const invoiceHref =
    result?.invoiceId && result.kind
      ? `/${result.kind === "invoice" ? "invoices" : "payment-requests"}?highlight=${result.invoiceId}`
      : null;

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        pending
          ? "border-violet-400/25 bg-violet-500/[0.06]"
          : "border-white/[0.08] bg-white/[0.025]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ring-1 ring-inset ${meta.tone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white">{meta.title}</p>
          <p className="text-[11px] text-slate-500">
            {pending ? "Prepared by the agent, not yet executed" : "Agent action"}
          </p>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>

      <div className="space-y-4 p-4">
        {pending && payload.type !== "collect_payment" ? (
          <>
            {payload.type === "create_invoice" || payload.type === "create_payment_request" ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <Field label="Amount" htmlFor="agent-amount">
                  <Input
                    id="agent-amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Currency" htmlFor="agent-currency">
                  <Select
                    id="agent-currency"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as Currency)}
                  >
                    {CURRENCIES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ) : null}

            {payload.type === "create_invoice" || payload.type === "create_payment_request" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Customer" htmlFor="agent-customer">
                  <Input
                    id="agent-customer"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Client or company"
                  />
                </Field>
                <Field label="Customer email" htmlFor="agent-email" hint="Used for reminders">
                  <Input
                    id="agent-email"
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder="client@example.com"
                  />
                </Field>
              </div>
            ) : null}

            {payload.type === "send_reminder" ? (
              <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Record</p>
                <p className="mt-1 font-mono text-xs text-slate-200">
                  {payload.invoice_number ?? "Selected request"}
                </p>
              </div>
            ) : null}

            {payload.type === "create_invoice" || payload.type === "create_payment_request" ? (
              <Field label="Description" htmlFor="agent-description">
                <Textarea
                  id="agent-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-20"
                  placeholder="What is being billed"
                />
              </Field>
            ) : null}

            {payload.type === "create_invoice" || payload.type === "create_payment_request" ? (
              <Field label="Due date" htmlFor="agent-due">
                <Input
                  id="agent-due"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </Field>
            ) : null}

            {payload.type === "send_reminder" ? (
              <Field label="Send to" htmlFor="agent-reminder-email">
                <Input
                  id="agent-reminder-email"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="customer@example.com"
                />
              </Field>
            ) : null}
          </>
        ) : null}

        {pending && payload.type === "collect_payment" ? (
          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
            <p className="text-xs text-slate-400">
              A Sandbox order will be created from the stored record. The buyer approves inside
              PayPal, and the server compares the captured amount with the record before settling.
            </p>
            <p className="mt-2 font-mono text-xs text-slate-200">
              {payload.invoice_number ?? "Stored payment request"}
            </p>
          </div>
        ) : null}

        {localError ? (
          <p className="flex items-start gap-1.5 text-xs leading-5 text-rose-200" role="alert">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {localError}
          </p>
        ) : null}

        {error && !pending ? (
          <p className="flex items-start gap-1.5 rounded-xl border border-rose-300/20 bg-rose-400/[0.06] px-3.5 py-2.5 text-xs leading-5 text-rose-100">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {error && pending ? (
          <p className="flex items-start gap-1.5 rounded-xl border border-amber-300/20 bg-amber-400/[0.06] px-3.5 py-2.5 text-xs leading-5 text-amber-100">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {result?.message && status === "executed" ? (
          <p className="flex items-start gap-1.5 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.06] px-3.5 py-2.5 text-xs leading-5 text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {result.message}
          </p>
        ) : null}

        {status === "executed" && (invoiceHref || result?.paymentRequestUrl) ? (
          <div className="flex flex-wrap gap-2">
            {invoiceHref ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={invoiceHref}>Open record</Link>
              </Button>
            ) : null}
            {result?.paymentRequestUrl ? (
              <Button asChild variant="cyan" size="sm">
                <a href={result.paymentRequestUrl} target="_blank" rel="noreferrer noopener">
                  Open PayPal approval
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {pending ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-4 py-3">
          <Button type="button" size="sm" onClick={requestConfirmation} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            Review and confirm
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDecline()}
            disabled={busy}
          >
            Not now
          </Button>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500">
            <ShieldQuestion className="h-3 w-3" aria-hidden="true" />
            Nothing runs until you confirm
          </span>
        </div>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-400/25">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <DialogTitle className="text-lg">Confirm this action</DialogTitle>
            </div>
            <DialogDescription>
              {payload.type === "collect_payment"
                ? "This creates a PayPal Sandbox order from the stored amount. You will approve it inside PayPal."
                : payload.type === "send_reminder"
                  ? "This sends a reminder email to the address shown below."
                  : "This saves a real record in your ledger. It does not charge anyone."}
            </DialogDescription>
          </DialogHeader>

          <dl className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            {summary.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 text-xs">
                <dt className="text-slate-500">{row.label}</dt>
                <dd className="text-right font-medium text-white">{row.value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-[11px] leading-5 text-slate-500">
            The server re-validates every field and can reject this request. Browser values are
            never trusted as the final amount.
          </p>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirm}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Confirm and run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
