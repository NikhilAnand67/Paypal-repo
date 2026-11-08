import { z } from "zod";
import { PAYPAL_CURRENCIES } from "@/lib/constants";
import type { Currency } from "@/types/database";

export const currencySchema = z.enum(
  PAYPAL_CURRENCIES as [Currency, ...Currency[]],
  { message: "Choose a supported currency." }
);

export const amountSchema = z.coerce
  .number({ message: "Enter an amount." })
  .refine((value) => Number.isFinite(value), "Enter a valid amount.")
  .min(0.01, "Amount must be at least 0.01.")
  .max(1_000_000, "Amount must be 1,000,000 or less.")
  .transform((value) => Math.round(value * 100) / 100);

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }, "Use a valid calendar date.")
  .nullable()
  .optional();

export const invoiceStatusSchema = z.enum(["draft", "pending", "paid", "overdue", "cancelled"]);
export const invoiceKindSchema = z.enum(["invoice", "payment_request"]);

export const invoiceCreateSchema = z.object({
  kind: invoiceKindSchema.default("invoice"),
  customer_name: z
    .string()
    .trim()
    .min(1, "Add a customer name.")
    .max(120, "Keep the name under 120 characters."),
  customer_email: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid email.")
    .optional(),
  description: z.string().trim().max(1200, "Keep the description under 1200 characters.").optional(),
  notes: z.string().trim().max(2000, "Keep notes under 2000 characters.").optional(),
  amount: amountSchema,
  currency: currencySchema.default("USD"),
  due_date: dateOnlySchema,
  status: invoiceStatusSchema.optional(),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial().extend({
  status: invoiceStatusSchema.optional(),
});

export const agentChatSchema = z.object({
  conversationId: z.string().uuid().optional().nullable(),
  message: z
    .string()
    .trim()
    .min(1, "Write a message.")
    .max(4000, "Keep messages under 4000 characters."),
});

export const actionOverridesSchema = z
  .object({
    amount: amountSchema.optional(),
    currency: currencySchema.optional(),
    customer_name: z.string().trim().min(1).max(120).optional(),
    customer_email: z
      .string()
      .trim()
      .max(200)
      .refine(
        (value) => value === "" || z.string().email().safeParse(value).success,
        "Enter a valid email."
      )
      .optional(),
    description: z.string().trim().max(1200).optional(),
    due_date: dateOnlySchema,
  })
  .strict();

export const executeActionSchema = z.object({
  actionId: z.string().uuid(),
  confirmed: z.literal(true, { message: "Explicit confirmation is required." }),
  overrides: actionOverridesSchema.optional(),
});

export const declineActionSchema = z.object({
  actionId: z.string().uuid(),
});

export const invoiceDraftSchema = z.object({
  customer: z.string().trim().max(120).optional().default(""),
  hint: z.string().trim().min(3, "Describe the work in a few words.").max(500),
  kind: invoiceKindSchema.default("invoice"),
});

export const paypalCreateOrderSchema = z.object({
  invoiceId: z.string().uuid(),
});

export const paypalCaptureOrderSchema = z.object({
  orderId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{6,64}$/, "The PayPal order id is not valid."),
});

export const profileUpdateSchema = z
  .object({
    full_name: z.string().trim().min(1, "Add your name.").max(80, "Keep your name under 80 characters.").optional(),
    avatar_url: z
      .string()
      .trim()
      .max(500)
      .refine(
        (value) => value === "" || /^https:\/\//.test(value),
        "Avatar must be an HTTPS image URL."
      )
      .optional(),
    currency: currencySchema.optional(),
    email_notifications: z.boolean().optional(),
    payment_notifications: z.boolean().optional(),
    security_alerts: z.boolean().optional(),
    marketing_updates: z.boolean().optional(),
  })
  .strict();

export const notificationUpdateSchema = z.object({
  is_read: z.boolean(),
});

export const demoSeedSchema = z.object({
  reset: z.boolean().optional().default(false),
});

export const idParamSchema = z.string().uuid();

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ActionOverrides = z.infer<typeof actionOverridesSchema>;
