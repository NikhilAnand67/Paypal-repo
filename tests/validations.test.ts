import { describe, expect, it } from "vitest";
import {
  actionOverridesSchema,
  amountSchema,
  dateOnlySchema,
  executeActionSchema,
  invoiceCreateSchema,
  profileUpdateSchema,
} from "@/lib/validations/schemas";

describe("amountSchema", () => {
  it("coerces strings and rounds to cents", () => {
    expect(amountSchema.parse("250.456")).toBe(250.46);
    expect(amountSchema.parse(19)).toBe(19);
  });

  it("rejects missing, negative, and oversized amounts", () => {
    expect(amountSchema.safeParse("").success).toBe(false);
    expect(amountSchema.safeParse(-5).success).toBe(false);
    expect(amountSchema.safeParse(0).success).toBe(false);
    expect(amountSchema.safeParse(1_000_001).success).toBe(false);
  });
});

describe("dateOnlySchema", () => {
  it("accepts real dates and omitted values", () => {
    expect(dateOnlySchema.parse("2026-12-01")).toBe("2026-12-01");
    expect(dateOnlySchema.parse(null)).toBeNull();
    expect(dateOnlySchema.parse(undefined)).toBeUndefined();
  });

  it("rejects malformed, empty, and impossible dates", () => {
    expect(dateOnlySchema.safeParse("12/01/2026").success).toBe(false);
    expect(dateOnlySchema.safeParse("2026-02-31").success).toBe(false);
    expect(dateOnlySchema.safeParse("").success).toBe(false);
  });
});

describe("invoiceCreateSchema", () => {
  it("applies safe defaults and trims text", () => {
    const parsed = invoiceCreateSchema.parse({
      customer_name: "  Acme Studio  ",
      amount: "250",
    });
    expect(parsed.customer_name).toBe("Acme Studio");
    expect(parsed.currency).toBe("USD");
    expect(parsed.kind).toBe("invoice");
  });

  it("rejects unknown customers and invalid emails", () => {
    expect(invoiceCreateSchema.safeParse({ customer_name: "", amount: 10 }).success).toBe(false);
    expect(
      invoiceCreateSchema.safeParse({
        customer_name: "Acme",
        amount: 10,
        customer_email: "not-an-email",
      }).success
    ).toBe(false);
  });
});

describe("executeActionSchema", () => {
  it("requires explicit confirmation", () => {
    const actionId = "3f6f6f4e-3a9f-4f4e-9f1e-2c8f0b6a1d23";
    expect(executeActionSchema.safeParse({ actionId, confirmed: true }).success).toBe(true);
    expect(executeActionSchema.safeParse({ actionId }).success).toBe(false);
    expect(executeActionSchema.safeParse({ actionId, confirmed: false }).success).toBe(false);
  });
});

describe("actionOverridesSchema", () => {
  it("allows editable fields but rejects unexpected keys", () => {
    expect(
      actionOverridesSchema.safeParse({ amount: 300, customer_name: "Acme" }).success
    ).toBe(true);
    expect(actionOverridesSchema.safeParse({ status: "paid" }).success).toBe(false);
  });
});

describe("profileUpdateSchema", () => {
  it("only allows HTTPS avatars", () => {
    expect(profileUpdateSchema.safeParse({ avatar_url: "https://cdn.example.com/a.png" }).success).toBe(
      true
    );
    expect(profileUpdateSchema.safeParse({ avatar_url: "javascript:alert(1)" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ avatar_url: "http://cdn.example.com/a.png" }).success).toBe(
      false
    );
  });
});
