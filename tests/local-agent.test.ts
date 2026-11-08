import { describe, expect, it } from "vitest";
import {
  extractEmail,
  parseAmount,
  parseDueDate,
  parseSubject,
  runLocalAgent,
} from "@/lib/ai/local-agent";
import type { AgentSnapshot } from "@/types/database";

function snapshot(overrides: Partial<AgentSnapshot> = {}): AgentSnapshot {
  return {
    generated_at: "2026-11-08T10:00:00.000Z",
    base_currency: "USD",
    totals: {
      received: 1480,
      outstanding: 920,
      completed_payments: 4,
      open_documents: 2,
      paid_invoices: 3,
      collection_rate: 60,
    },
    monthly: [],
    invoices: [],
    recent_transactions: [],
    demo_data_present: false,
    ...overrides,
  } as AgentSnapshot;
}

describe("parseAmount", () => {
  it("reads symbol and code amounts", () => {
    expect(parseAmount("Create a $250 payment request")).toEqual({ amount: 250, currency: "USD" });
    expect(parseAmount("invoice for €1,240.50")).toEqual({ amount: 1240.5, currency: "EUR" });
    expect(parseAmount("charge 900 gbp for design")).toEqual({ amount: 900, currency: "GBP" });
    expect(parseAmount("5000 yen retainer")).toEqual({ amount: 5000, currency: "JPY" });
  });

  it("returns null when no positive amount exists", () => {
    expect(parseAmount("send a reminder for the pending invoice").amount).toBeNull();
    expect(parseAmount("$0").amount).toBeNull();
  });
});

describe("parseDueDate", () => {
  const now = new Date("2026-11-08T09:00:00");

  it("handles relative, ISO, and named dates", () => {
    expect(parseDueDate("due in seven days", now)).toBe("2026-11-15");
    expect(parseDueDate("due in two weeks", now)).toBe("2026-11-22");
    expect(parseDueDate("on 2026-12-01", now)).toBe("2026-12-01");
    expect(parseDueDate("due December 20th", now)).toBe("2026-12-20");
    expect(parseDueDate("due tomorrow", now)).toBe("2026-11-09");
    expect(parseDueDate("no date here", now)).toBeNull();
  });

  it("rejects impossible calendar dates", () => {
    expect(parseDueDate("due 2026-02-31", now)).toBeNull();
    expect(parseDueDate("due April 31st", now)).toBeNull();
  });
});

describe("parseSubject", () => {
  it("separates a named customer from the work description", () => {
    expect(parseSubject("Invoice Acme Studio for logo design")).toEqual({
      customer_name: "Acme Studio",
      description: "Logo Design",
    });
  });

  it("treats service phrases as the scope, not the customer", () => {
    const result = parseSubject(
      "Create a $250 payment request for my website development client, due in seven days"
    );
    expect(result.customer_name).toBeNull();
    expect(result.description).toBe("Website Development");
  });

  it("returns nulls when nothing usable is present", () => {
    expect(parseSubject("hello there")).toEqual({ customer_name: null, description: null });
  });
});

describe("extractEmail", () => {
  it("extracts and lowercases the first address", () => {
    expect(extractEmail("Send it to Dana@Studio.COM please")).toBe("dana@studio.com");
    expect(extractEmail("no address")).toBeNull();
  });
});

describe("runLocalAgent", () => {
  const now = new Date("2026-11-08T09:00:00");

  it("prepares the hackathon example payment request without executing it", () => {
    const result = runLocalAgent(
      "Create a $250 payment request for my website development client, due in seven days.",
      snapshot(),
      now
    );

    expect(result.intent).toBe("create_payment_request");
    expect(result.action).toMatchObject({
      type: "create_payment_request",
      amount: 250,
      currency: "USD",
      due_date: "2026-11-15",
    });
    expect(result.reply).toMatch(/confirm/i);
  });

  it("drafts an invoice that is missing details and says what to add", () => {
    const result = runLocalAgent("Create an invoice for brand design", snapshot(), now);
    expect(result.intent).toBe("create_invoice");
    expect(result.action?.amount).toBeNull();
    expect(result.reply).toMatch(/customer name/i);
  });

  it("routes balance and analysis questions without creating actions", () => {
    expect(runLocalAgent("Which invoices are still pending?", snapshot()).intent).toBe(
      "pending_payments"
    );
    expect(runLocalAgent("Analyze my cash flow", snapshot()).intent).toBe("analyze_cashflow");
    expect(runLocalAgent("Summarize my payment activity", snapshot()).intent).toBe("summarize");
    expect(runLocalAgent("hello", snapshot()).intent).toBe("help");
  });

  it("never fabricates figures without stored records", () => {
    const result = runLocalAgent("Summarize my payment activity", snapshot());
    expect(result.action).toBeNull();
    expect(result.reply).toMatch(/no|empty|waiting|nothing/i);
  });
});
