import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk, parseBody } from "@/lib/security/http";
import { demoSeedSchema } from "@/lib/validations/schemas";
import { recordAudit } from "@/lib/security/audit";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import type { Currency, InvoiceKind, InvoiceStatus, TransactionStatus } from "@/types/database";

export const runtime = "nodejs";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function dateOnly(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function monthStamp() {
  const now = new Date();
  return `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
}

type DemoInvoice = {
  key: string;
  kind: InvoiceKind;
  customer: string;
  email: string;
  description: string;
  amount: number;
  currency: Currency;
  createdDaysAgo: number;
  dueOffsetDays: number;
  status: InvoiceStatus;
};

const INVOICES: DemoInvoice[] = [
  {
    key: "brightline",
    kind: "invoice",
    customer: "Brightline Audio",
    email: "accounts@brightline.example",
    description: "Podcast launch package including cover art and show notes templates.",
    amount: 1890.35,
    currency: "USD",
    createdDaysAgo: 188,
    dueOffsetDays: -163,
    status: "paid",
  },
  {
    key: "kite",
    kind: "invoice",
    customer: "Kite & Harbor",
    email: "finance@kiteharbor.example",
    description: "Motion identity package for the autumn campaign.",
    amount: 5400,
    currency: "USD",
    createdDaysAgo: 152,
    dueOffsetDays: -122,
    status: "paid",
  },
  {
    key: "northwind",
    kind: "invoice",
    customer: "Northwind Studio",
    email: "billing@northwind.example",
    description: "Brand identity system and launch kit.",
    amount: 2450.5,
    currency: "USD",
    createdDaysAgo: 112,
    dueOffsetDays: -88,
    status: "paid",
  },
  {
    key: "fielder",
    kind: "invoice",
    customer: "Fielder Creative",
    email: "ops@fielder.example",
    description: "Retainer for editorial content and campaign support.",
    amount: 960,
    currency: "USD",
    createdDaysAgo: 72,
    dueOffsetDays: -48,
    status: "paid",
  },
  {
    key: "harper",
    kind: "invoice",
    customer: "Harper Lane",
    email: "harper@harperlane.example",
    description: "Editorial illustration set for the winter issue.",
    amount: 780.25,
    currency: "USD",
    createdDaysAgo: 33,
    dueOffsetDays: -18,
    status: "paid",
  },
  {
    key: "juniper",
    kind: "invoice",
    customer: "Juniper Press",
    email: "accounts@juniperpress.example",
    description: "Typesetting and cover layout for the poetry collection.",
    amount: 640,
    currency: "USD",
    createdDaysAgo: 27,
    dueOffsetDays: -11,
    status: "pending",
  },
  {
    key: "mosaic",
    kind: "payment_request",
    customer: "Mosaic Labs",
    email: "studio@mosaiclabs.example",
    description: "Analytics dashboard audit and usability review.",
    amount: 1685.75,
    currency: "USD",
    createdDaysAgo: 13,
    dueOffsetDays: 3,
    status: "pending",
  },
  {
    key: "cedar",
    kind: "payment_request",
    customer: "Cedar & Co",
    email: "pay@cedarandco.example",
    description: "Product landing page design and implementation.",
    amount: 3120,
    currency: "USD",
    createdDaysAgo: 8,
    dueOffsetDays: 9,
    status: "pending",
  },
  {
    key: "atlas",
    kind: "payment_request",
    customer: "Atlas Tutoring",
    email: "hello@atlastutoring.example",
    description: "September tutoring sessions and study guides.",
    amount: 425.4,
    currency: "USD",
    createdDaysAgo: 5,
    dueOffsetDays: -2,
    status: "pending",
  },
  {
    key: "lumen",
    kind: "payment_request",
    customer: "Lumen Works",
    email: "finance@lumenworks.example",
    description: "UX research sprint across two product teams.",
    amount: 1280,
    currency: "EUR",
    createdDaysAgo: 3,
    dueOffsetDays: 12,
    status: "pending",
  },
];

type DemoTransaction = {
  key: string;
  invoiceKey: string;
  orderId: string;
  captureId: string | null;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  description: string;
  daysAgo: number;
  failureReason?: string;
};

const TRANSACTIONS: DemoTransaction[] = [
  {
    key: "t-brightline",
    invoiceKey: "brightline",
    orderId: "DEMO-ORDER-1001",
    captureId: "DEMO-CAPTURE-1001",
    amount: 1890.35,
    currency: "USD",
    status: "completed",
    description: "Podcast launch package",
    daysAgo: 182,
  },
  {
    key: "t-kite",
    invoiceKey: "kite",
    orderId: "DEMO-ORDER-1002",
    captureId: "DEMO-CAPTURE-1002",
    amount: 5400,
    currency: "USD",
    status: "completed",
    description: "Motion identity package",
    daysAgo: 146,
  },
  {
    key: "t-northwind",
    invoiceKey: "northwind",
    orderId: "DEMO-ORDER-1003",
    captureId: "DEMO-CAPTURE-1003",
    amount: 2450.5,
    currency: "USD",
    status: "completed",
    description: "Brand identity system",
    daysAgo: 106,
  },
  {
    key: "t-fielder",
    invoiceKey: "fielder",
    orderId: "DEMO-ORDER-1004",
    captureId: "DEMO-CAPTURE-1004",
    amount: 960,
    currency: "USD",
    status: "completed",
    description: "Editorial retainer",
    daysAgo: 66,
  },
  {
    key: "t-harper",
    invoiceKey: "harper",
    orderId: "DEMO-ORDER-1005",
    captureId: "DEMO-CAPTURE-1005",
    amount: 780.25,
    currency: "USD",
    status: "completed",
    description: "Editorial illustration set",
    daysAgo: 27,
  },
  {
    key: "t-juniper",
    invoiceKey: "juniper",
    orderId: "DEMO-ORDER-1006",
    captureId: "DEMO-CAPTURE-1006",
    amount: 640,
    currency: "USD",
    status: "refunded",
    description: "Poetry collection layout",
    daysAgo: 9,
    failureReason: "Demonstration refund recorded for the sandbox ledger.",
  },
  {
    key: "t-mosaic",
    invoiceKey: "mosaic",
    orderId: "DEMO-ORDER-1007",
    captureId: null,
    amount: 1685.75,
    currency: "USD",
    status: "failed",
    description: "Analytics dashboard audit",
    daysAgo: 6,
    failureReason: "Sandbox payer declined the card.",
  },
];

export async function POST(request: NextRequest) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "demo-seed", 6, 60_000);
  if (!limited.ok) return limited.response;

  const parsed = await parseBody(request, demoSeedSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = account.supabase;

  await supabase.from("transactions").delete().eq("user_id", user.id).eq("is_demo", true);
  await supabase.from("invoices").delete().eq("user_id", user.id).eq("is_demo", true);
  await supabase.from("notifications").delete().eq("user_id", user.id).eq("is_demo", true);

  const stamp = monthStamp();
  const invoiceRows = INVOICES.map((invoice, index) => ({
    user_id: user.id,
    kind: invoice.kind,
    invoice_number: `DEMO-${invoice.kind === "invoice" ? "INV" : "PR"}-${stamp}-${1000 + index}`,
    customer_name: invoice.customer,
    customer_email: invoice.email,
    description: invoice.description,
    notes: "Demonstration record generated inside PayPilot AI. Not a real transaction.",
    amount: invoice.amount,
    currency: invoice.currency,
    due_date: dateOnly(invoice.dueOffsetDays),
    status: invoice.status,
    is_demo: true,
    created_at: daysAgo(invoice.createdDaysAgo),
  }));

  const { data: insertedInvoices, error: invoiceError } = await supabase
    .from("invoices")
    .insert(invoiceRows)
    .select("id,invoice_number");

  if (invoiceError || !insertedInvoices) {
    return jsonError(503, "Demonstration invoices could not be created.", {
      code: friendlyDatabaseError(invoiceError) ?? "demo_seed_failed",
    });
  }

  const invoiceIdByNumber = new Map(
    insertedInvoices.map((row) => [(row as { invoice_number: string }).invoice_number, (row as { id: string }).id])
  );
  const orderIndex = new Map(INVOICES.map((invoice, index) => [invoice.key, index]));
  const invoiceIdByKey = new Map(
    INVOICES.map((invoice, index) => {
      const number = `DEMO-${invoice.kind === "invoice" ? "INV" : "PR"}-${stamp}-${1000 + index}`;
      return [invoice.key, invoiceIdByNumber.get(number) ?? null];
    })
  );

  const transactionRows = TRANSACTIONS.map((transaction) => ({
    user_id: user.id,
    invoice_id: invoiceIdByKey.get(transaction.invoiceKey) ?? null,
    paypal_order_id: transaction.orderId,
    paypal_capture_id: transaction.captureId,
    paypal_payer_id: `DEMO-PAYER-${transaction.key.toUpperCase()}`,
    amount: transaction.amount,
    currency: transaction.currency,
    status: transaction.status,
    payment_provider: "paypal",
    payment_description: transaction.description,
    failure_reason: transaction.failureReason ?? null,
    is_demo: true,
    created_at: daysAgo(transaction.daysAgo),
  }));

  const { error: transactionError } = await supabase.from("transactions").insert(transactionRows);

  if (transactionError) {
    await supabase.from("invoices").delete().eq("user_id", user.id).eq("is_demo", true);
    return jsonError(503, "Demonstration transactions could not be created.", {
      code: friendlyDatabaseError(transactionError) ?? "demo_seed_failed",
    });
  }

  const notifications = [
    {
      user_id: user.id,
      title: "Demonstration ledger loaded",
      message:
        "These records are isolated with a demo flag. They never mix with real PayPal sandbox captures.",
      notification_type: "system" as const,
      link: "/dashboard",
      is_demo: true,
      is_read: false,
      created_at: daysAgo(1),
    },
    {
      user_id: user.id,
      title: "Payment received from Northwind Studio",
      message: "$2,450.50 was captured in the demonstration ledger.",
      notification_type: "payment" as const,
      link: "/transactions",
      is_demo: true,
      is_read: true,
      created_at: daysAgo(5),
    },
    {
      user_id: user.id,
      title: "Atlas Tutoring request is past due",
      message: "PR for $425.40 passed its demonstration due date. A reminder is a good next step.",
      notification_type: "reminder" as const,
      link: "/payment-requests",
      is_demo: true,
      is_read: false,
      created_at: daysAgo(2),
    },
    {
      user_id: user.id,
      title: "A euro request was added to the ledger",
      message:
        "Money totals use one currency at a time, so EUR records are excluded from USD totals.",
      notification_type: "invoice" as const,
      link: "/analytics",
      is_demo: true,
      is_read: true,
      created_at: daysAgo(3),
    },
  ];

  await supabase.from("notifications").insert(notifications);

  await recordAudit(supabase, user.id, {
    action: "demo_data_loaded",
    resourceType: "demo_ledger",
    metadata: {
      invoices: invoiceRows.length,
      transactions: transactionRows.length,
      notifications: notifications.length,
      reset: parsed.data.reset,
      demoOrderIndexes: orderIndex.size,
    },
    context: limited.context,
  });

  return jsonOk({
    seeded: true,
    counts: {
      invoices: invoiceRows.length,
      transactions: transactionRows.length,
      notifications: notifications.length,
    },
    message:
      "Demonstration data is loaded and labeled. Real PayPal sandbox captures stay separate.",
  });
}
