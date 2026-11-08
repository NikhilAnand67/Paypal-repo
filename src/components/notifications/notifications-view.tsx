"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  CheckCheck,
  FileText,
  ShieldAlert,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { AppNotification } from "@/types/database";

const typeMeta: Record<
  AppNotification["notification_type"],
  { icon: typeof Bell; tone: string; label: string }
> = {
  payment: { icon: Wallet, tone: "text-emerald-200 bg-emerald-400/10 ring-emerald-300/20", label: "Payment" },
  invoice: { icon: FileText, tone: "text-cyan-200 bg-cyan-400/10 ring-cyan-300/20", label: "Invoice" },
  security: { icon: ShieldAlert, tone: "text-rose-200 bg-rose-400/10 ring-rose-300/20", label: "Security" },
  reminder: { icon: BellRing, tone: "text-amber-200 bg-amber-400/10 ring-amber-300/20", label: "Reminder" },
  system: { icon: Bell, tone: "text-violet-200 bg-violet-500/10 ring-violet-400/20", label: "System" },
};

export function NotificationsView({
  notifications: initialNotifications,
  databaseError,
}: {
  notifications: AppNotification[];
  databaseError?: string | null;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const filtered = useMemo(
    () => (filter === "unread" ? notifications.filter((item) => !item.is_read) : notifications),
    [filter, notifications]
  );

  function broadcast() {
    window.dispatchEvent(new Event("paypilot:notifications-updated"));
  }

  async function updateRead(notification: AppNotification) {
    setBusy(notification.id);
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: !notification.is_read }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "The notification could not be updated.");
        return;
      }
      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id ? { ...item, is_read: !item.is_read } : item
        )
      );
      broadcast();
    } catch {
      toast.error("The notification could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Notifications could not be updated.");
        return;
      }
      setNotifications((previous) => previous.map((item) => ({ ...item, is_read: true })));
      broadcast();
      router.refresh();
    } catch {
      toast.error("Notifications could not be updated.");
    } finally {
      setMarkingAll(false);
    }
  }

  async function remove(notification: AppNotification) {
    setBusy(notification.id);
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "The notification could not be deleted.");
        return;
      }
      setNotifications((previous) => previous.filter((item) => item.id !== notification.id));
      broadcast();
      toast.success("Notification removed.");
    } catch {
      toast.error("The notification could not be deleted.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {databaseError === "database_not_initialized" ? (
        <p className="rounded-xl border border-amber-300/20 bg-amber-400/[0.05] px-4 py-3 text-xs leading-5 text-amber-100">
          The database schema is not applied yet, so notifications cannot be loaded. Apply
          <span className="font-mono"> supabase/migrations/0001_init.sql</span> and reload.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
          {(
            [
              { value: "all", label: `All (${notifications.length})` },
              { value: "unread", label: `Unread (${unreadCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              aria-pressed={filter === tab.value}
              className={cn(
                "focus-ring rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filter === tab.value
                  ? "bg-white/[0.08] text-white"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-auto"
          onClick={markAllRead}
          loading={markingAll}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Mark all read
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "You are all caught up" : "No notifications yet"}
          description={
            filter === "unread"
              ? "Every notification in your workspace has been read."
              : "Payment, invoice, reminder, and security updates will appear here."
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((notification) => {
            const meta = typeMeta[notification.notification_type] ?? typeMeta.system;
            const Icon = meta.icon;
            return (
              <li
                key={notification.id}
                className={cn(
                  "rounded-2xl border bg-white/[0.02] p-4 transition-colors",
                  notification.is_read
                    ? "border-white/[0.06]"
                    : "border-violet-400/20 bg-violet-500/[0.05]"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${meta.tone}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{notification.title}</p>
                      {!notification.is_read ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-300" aria-label="Unread" />
                      ) : null}
                      {notification.is_demo ? (
                        <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                          Demo
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{notification.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
                      <span>{meta.label}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(notification.created_at)}</span>
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          className="focus-ring rounded font-medium text-cyan-300 transition-colors hover:text-cyan-200"
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      onClick={() => void updateRead(notification)}
                      disabled={busy === notification.id}
                      aria-label={notification.is_read ? "Mark as unread" : "Mark as read"}
                    >
                      <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      onClick={() => void remove(notification)}
                      disabled={busy === notification.id}
                      aria-label="Delete notification"
                      className="text-slate-500 hover:text-rose-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
