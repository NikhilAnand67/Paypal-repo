import { type NextRequest } from "next/server";
import { requireApiUser, enforceRateLimit, rejectCrossOrigin } from "@/lib/api/guards";
import { jsonError, jsonOk, parseBody } from "@/lib/security/http";
import { invoiceUpdateSchema } from "@/lib/validations/schemas";
import { friendlyDatabaseError } from "@/lib/data/invoices";
import { recordAudit } from "@/lib/security/audit";
import type { Database, Invoice } from "@/types/database";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, context: RouteContext) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return jsonError(400, "That request id is not valid.", { code: "invalid_id" });
  }

  const { data, error } = await account.supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", account.user!.id)
    .maybeSingle();

  if (error) {
    return jsonError(503, "The request is not available yet.", {
      code: friendlyDatabaseError(error) ?? "invoice_unavailable",
    });
  }
  if (!data) {
    return jsonError(404, "That record was not found on your account.", {
      code: "invoice_not_found",
    });
  }

  return jsonOk({ invoice: data as Invoice });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "invoices-update", 60);
  if (!limited.ok) return limited.response;

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return jsonError(400, "That request id is not valid.", { code: "invalid_id" });
  }

  const parsed = await parseBody(request, invoiceUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const input = parsed.data;
  const providedKeys = Object.keys(input).filter(
    (key) => (input as Record<string, unknown>)[key] !== undefined
  );
  if (providedKeys.length === 0) {
    return jsonError(400, "Nothing to update.", { code: "empty_update" });
  }

  if (input.status === "paid") {
    return jsonError(400, "Payments are marked paid only after a verified PayPal capture.", {
      code: "manual_paid_not_allowed",
    });
  }

  const { data: row, error } = await account.supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError(503, "The request is not available yet.", {
      code: friendlyDatabaseError(error) ?? "invoice_unavailable",
    });
  }
  if (!row) {
    return jsonError(404, "That record was not found on your account.", {
      code: "invoice_not_found",
    });
  }

  const invoice = row as Invoice;

  if (input.kind && input.kind !== invoice.kind) {
    return jsonError(400, "The record type cannot be changed after creation.", {
      code: "kind_immutable",
    });
  }

  if (invoice.status === "paid") {
    const nonNoteFields = providedKeys.filter((key) => key !== "notes");
    if (nonNoteFields.length > 0) {
      return jsonError(409, "A paid record is locked. Only internal notes can change.", {
        code: "invoice_locked",
        details: { lockedFields: nonNoteFields },
      });
    }
  }

  const update: Database["public"]["Tables"]["invoices"]["Update"] = {};

  if (input.customer_name !== undefined) update.customer_name = input.customer_name;
  if (input.customer_email !== undefined) {
    update.customer_email = input.customer_email === "" ? null : input.customer_email;
  }
  if (input.description !== undefined) update.description = input.description;
  if (input.notes !== undefined) update.notes = input.notes;
  if (input.amount !== undefined) update.amount = input.amount;
  if (input.currency !== undefined) update.currency = input.currency;
  if (input.due_date !== undefined) update.due_date = input.due_date ?? null;
  if (input.status !== undefined) update.status = input.status;

  const amountChanged =
    input.amount !== undefined && Math.abs(Number(input.amount) - Number(invoice.amount)) > 0.009;
  const currencyChanged = input.currency !== undefined && input.currency !== invoice.currency;
  const moneyChanged = amountChanged || currencyChanged;
  const cancelled = input.status === "cancelled";

  if ((moneyChanged || cancelled) && invoice.paypal_order_id) {
    update.paypal_order_id = null;
    await account.supabase
      .from("transactions")
      .update({
        status: "failed",
        failure_reason: moneyChanged
          ? "The request amount changed before payment."
          : "The request was cancelled before payment.",
      })
      .eq("invoice_id", invoice.id)
      .eq("user_id", user.id)
      .eq("status", "created");
  }

  const { data: updated, error: updateError } = await account.supabase
    .from("invoices")
    .update(update)
    .eq("id", invoice.id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (updateError) {
    return jsonError(503, "The changes could not be saved.", {
      code: friendlyDatabaseError(updateError) ?? "invoice_update_failed",
    });
  }

  await recordAudit(account.supabase, user.id, {
    action: "invoice_updated",
    resourceType: "invoice",
    resourceId: invoice.id,
    metadata: {
      fields: providedKeys.filter((key) => key !== "kind"),
      moneyChanged,
      cancelled,
      demo: invoice.is_demo,
    },
    context: limited.context,
  });

  return jsonOk({ invoice: updated as Invoice });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { account, response } = await requireApiUser();
  if (response) return response;

  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = account.user!;
  const limited = enforceRateLimit(request, user.id, "invoices-delete", 20);
  if (!limited.ok) return limited.response;

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return jsonError(400, "That request id is not valid.", { code: "invalid_id" });
  }

  const { data: row } = await account.supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) {
    return jsonError(404, "That record was not found on your account.", {
      code: "invoice_not_found",
    });
  }

  const invoice = row as Invoice;
  if (invoice.status === "paid") {
    return jsonError(409, "A paid record cannot be deleted. It belongs to your ledger history.", {
      code: "invoice_locked",
    });
  }

  await account.supabase
    .from("transactions")
    .update({ status: "failed", failure_reason: "The linked request was deleted." })
    .eq("invoice_id", invoice.id)
    .eq("user_id", user.id)
    .eq("status", "created");

  const { error } = await account.supabase
    .from("invoices")
    .delete()
    .eq("id", invoice.id)
    .eq("user_id", user.id);

  if (error) {
    return jsonError(503, "The record could not be deleted.", {
      code: friendlyDatabaseError(error) ?? "invoice_delete_failed",
    });
  }

  await recordAudit(account.supabase, user.id, {
    action: "invoice_deleted",
    resourceType: "invoice",
    resourceId: invoice.id,
    metadata: { invoiceNumber: invoice.invoice_number, demo: invoice.is_demo },
    context: limited.context,
  });

  return jsonOk({ deleted: true, id: invoice.id });
}
