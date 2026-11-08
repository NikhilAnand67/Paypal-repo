import { describe, expect, it } from "vitest";
import { buildAnalytics } from "@/lib/data/analytics";
import type { Invoice, Transaction } from "@/types/database";

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    kind: "invoice",
    invoice_number: "INV-2026-0001",
    customer_name: "Acme Studio",
    customer_email: "billing@acme.test",
    description: "Website redesign",
    notes: null,
    amount: 250,
    currency: "USD",
    due_date: "2026-08-30",
    status: "paid",
    paypal_order_id: null,
    paypal_invoice_id: null,
    is_demo: false,
    created_at: "2026-08-15T10:00:00.000Z",
    updated_at: "2026-08-15T10:00:00.000Z",
    ...overrides,
  };
}

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    invoice_id: null,
    paypal_order_id: "ORDER-1",
    paypal_capture_id: "CAPTURE-1",
    paypal_payer_id: "PAYER-1",
    amount: 250,
    currency: "USD",
    status: "completed",
    payment_provider: "paypal",
    payment_description: "Website redesign",
    failure_reason: null,
    is_demo: false,
    created_at: "2026-08-16T10:00:00.000Z",
    updated_at: "2026-08-16T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildAnalytics", () => {
  const now = new Date("2026-11-08T12:00:00");

  it("derives every figure from the supplied ledger", () => {
    const summary = buildAnalytics(
      [
        invoice({ status: "paid", amount: 250 }),
        invoice({ status: "pending", amount: 400, created_at: "2026-11-01T10:00:00.000Z" }),
      ],
      [transaction({ amount: 250 })],
      "USD",
      now
    );

    expect(summary.totalReceived).toBe(250);
    expect(summary.completedCount).toBe(1);
    expect(summary.pendingAmount).toBe(400);
    expect(summary.invoiceTotal).toBe(650);
    expect(summary.collectionRate).toBe(50);
    expect(summary.averagePayment).toBe(250);
    expect(summary.hasData).toBe(true);
    expect(summary.hasDemoData).toBe(false);
    expect(summary.monthly).toHaveLength(6);
  });

  it("excludes other currencies instead of inventing an exchange rate", () => {
    const summary = buildAnalytics(
      [invoice({ status: "paid" }), invoice({ status: "pending", amount: 100, currency: "EUR" })],
      [transaction({ amount: 250 }), transaction({ amount: 100, currency: "EUR" })],
      "USD",
      now
    );

    expect(summary.baseCurrency).toBe("USD");
    expect(summary.totalReceived).toBe(250);
    expect(summary.pendingAmount).toBe(0);
    expect(summary.excludedCurrencyCount).toBe(2);
  });

  it("returns zeros for an empty ledger", () => {
    const summary = buildAnalytics([], [], "USD", now);

    expect(summary.totalReceived).toBe(0);
    expect(summary.pendingAmount).toBe(0);
    expect(summary.collectionRate).toBe(0);
    expect(summary.averagePayment).toBe(0);
    expect(summary.hasData).toBe(false);
    expect(summary.topCustomers).toEqual([]);
    expect(summary.monthly).toHaveLength(6);
  });

  it("flags demonstration records when they are part of the ledger", () => {
    const summary = buildAnalytics(
      [invoice({ is_demo: true, status: "paid" })],
      [transaction({ is_demo: true })],
      "USD",
      now
    );

    expect(summary.hasDemoData).toBe(true);
  });

  it("falls back to the dominant currency when the profile currency has no records", () => {
    const summary = buildAnalytics(
      [invoice({ currency: "EUR", status: "paid" })],
      [transaction({ currency: "EUR" })],
      "USD",
      now
    );

    expect(summary.baseCurrency).toBe("EUR");
    expect(summary.totalReceived).toBe(250);
  });
});
