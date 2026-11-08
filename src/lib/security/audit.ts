import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, NotificationType } from "@/types/database";

export type AuditInput = {
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Json;
  context?: { ip: string | null; userAgent: string | null };
};

/** Append only audit trail. Failures never interrupt the user's request. */
export async function recordAudit(
  supabase: SupabaseClient<Database>,
  userId: string | null,
  input: AuditInput
) {
  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: input.action,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      ip_address: input.context?.ip ?? null,
      user_agent: input.context?.userAgent ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Audit failures are logged by the platform and never break a main flow.
  }
}

export async function pushNotification(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    link?: string | null;
  }
) {
  try {
    await supabase.from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      message: input.message,
      notification_type: input.type ?? "system",
      link: input.link ?? null,
    });
  } catch {
    // Notifications are best effort.
  }
}
