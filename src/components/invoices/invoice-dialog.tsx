"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CURRENCIES } from "@/lib/constants";
import { addDays, toDateOnly } from "@/lib/utils/dates";
import type { Currency, Invoice, InvoiceKind, InvoiceStatus } from "@/types/database";

type FormState = {
  customer_name: string;
  customer_email: string;
  description: string;
  notes: string;
  amount: string;
  currency: Currency;
  due_date: string;
  status: InvoiceStatus;
};

function emptyState(defaultCurrency: Currency, kind: InvoiceKind): FormState {
  return {
    customer_name: "",
    customer_email: "",
    description: "",
    notes: "",
    amount: "",
    currency: defaultCurrency,
    due_date: toDateOnly(addDays(new Date(), 14)),
    status: kind === "payment_request" ? "pending" : "draft",
  };
}

function fromInvoice(invoice: Invoice): FormState {
  return {
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email ?? "",
    description: invoice.description,
    notes: invoice.notes ?? "",
    amount: String(invoice.amount),
    currency: invoice.currency,
    due_date: invoice.due_date ?? "",
    status: invoice.status,
  };
}

type ApiError = {
  error?: string;
  code?: string;
  details?: Array<{ path: string; message: string }>;
};

export function InvoiceDialog({
  open,
  onOpenChange,
  kind,
  invoice,
  defaultCurrency,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: InvoiceKind;
  invoice?: Invoice | null;
  defaultCurrency: Currency;
  onSaved: () => void;
}) {
  const editing = Boolean(invoice);
  const [form, setForm] = useState<FormState>(() =>
    invoice ? fromInvoice(invoice) : emptyState(defaultCurrency, kind)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      kind,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      description: form.description,
      notes: form.notes,
      amount: form.amount,
      currency: form.currency,
      due_date: form.due_date || null,
      status: form.status,
    };

    try {
      const response = await fetch(editing ? `/api/invoices/${invoice!.id}` : "/api/invoices", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ApiError;

      if (!response.ok) {
        if (result.details?.length) {
          setFieldErrors(
            Object.fromEntries(result.details.map((detail) => [detail.path, detail.message]))
          );
        }
        setError(result.error ?? "The record could not be saved.");
        return;
      }

      toast.success(
        editing
          ? "Record updated."
          : kind === "invoice"
            ? "Invoice created. It is saved in your ledger."
            : "Payment request created. Nothing has been sent yet."
      );
      if (!editing) {
        setForm(emptyState(defaultCurrency, kind));
        setFieldErrors({});
      }
      onOpenChange(false);
      onSaved();
    } catch {
      setError("The record could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? kind === "invoice"
                ? "Edit invoice"
                : "Edit payment request"
              : kind === "invoice"
                ? "New invoice"
                : "New payment request"}
          </DialogTitle>
          <DialogDescription>
            {kind === "invoice"
              ? "A record you can track, download as a PDF, and collect through PayPal Sandbox."
              : "A request that can open a real PayPal Sandbox order once you approve it."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-300/20 bg-rose-400/[0.07] px-3.5 py-2.5 text-xs leading-5 text-rose-100"
          >
            {error}
          </p>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Customer name"
              htmlFor="customer_name"
              required
              error={fieldErrors.customer_name}
            >
              <Input
                id="customer_name"
                value={form.customer_name}
                onChange={(event) => update("customer_name", event.target.value)}
                placeholder="Northwind Studio"
                maxLength={120}
                required
              />
            </Field>
            <Field label="Customer email" htmlFor="customer_email" error={fieldErrors.customer_email}>
              <Input
                id="customer_email"
                type="email"
                value={form.customer_email}
                onChange={(event) => update("customer_email", event.target.value)}
                placeholder="billing@example.com"
                maxLength={200}
              />
            </Field>
          </div>

          <Field
            label="Description"
            htmlFor="description"
            error={fieldErrors.description}
            hint="What the customer is paying for."
          >
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Website development for the autumn launch"
              maxLength={1200}
              rows={3}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Amount" htmlFor="amount" required error={fieldErrors.amount}>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                max="1000000"
                step="0.01"
                value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
                placeholder="250.00"
                required
              />
            </Field>
            <Field label="Currency" htmlFor="currency" required error={fieldErrors.currency}>
              <Select
                id="currency"
                value={form.currency}
                onChange={(event) => update("currency", event.target.value as Currency)}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} · {currency.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due date" htmlFor="due_date" error={fieldErrors.due_date}>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(event) => update("due_date", event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="status" error={fieldErrors.status}>
              <Select
                id="status"
                value={form.status}
                onChange={(event) => update("status", event.target.value as InvoiceStatus)}
                disabled={invoice?.status === "paid"}
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                {editing ? <option value="cancelled">Cancelled</option> : null}
              </Select>
            </Field>
            <Field label="Internal notes" htmlFor="notes" error={fieldErrors.notes}>
              <Input
                id="notes"
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Optional context for you"
                maxLength={2000}
              />
            </Field>
          </div>

          {invoice?.status === "paid" ? (
            <p className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.05] px-3.5 py-2.5 text-xs leading-5 text-emerald-100">
              Paid records are locked. Amounts, status, and customer details cannot be changed after
              settlement, which protects the ledger from accidental edits.
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {editing ? "Save changes" : kind === "invoice" ? "Create invoice" : "Create request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
