"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/status-pill";
import { formatRelativeTime } from "@/lib/utils/format";
import type { AppNotification } from "@/types/database";
import { cn } from "@/lib/utils/cn";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=8");
      if (!response.ok) return;
      const payload = (await response.json()) as {
        notifications?: AppNotification[];
        unreadCount?: number;
      };
      setNotifications(payload.notifications ?? []);
      setUnread(payload.unreadCount ?? 0);
    } catch {
      // The bell is non critical. Keep the last known state.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // State is applied after the awaited fetch inside load, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const handler = () => void load();
    window.addEventListener("paypilot:notifications-updated", handler);
    return () => window.removeEventListener("paypilot:notifications-updated", handler);
  }, [load]);

  async function markAllRead() {
    setMarking(true);
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!response.ok) {
        toast.error("Notifications could not be updated.");
        return;
      }
      setNotifications((rows) => rows.map((row) => ({ ...row, is_read: true })));
      setUnread(0);
      window.dispatchEvent(new Event("paypilot:notifications-updated"));
      router.refresh();
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Notifications could not be updated.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="focus-ring relative grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-300 transition-colors hover:border-white/15 hover:text-white"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1 text-[10px] font-semibold text-white ring-2 ring-ink-950">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,380px)] p-0" align="end">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unread > 0 ? <Badge tone="violet">{unread} new</Badge> : null}
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={marking || unread === 0}
            className="focus-ring inline-flex items-center gap-1 rounded text-xs font-medium text-slate-400 transition-colors hover:text-white disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Mark all read
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-6 text-xs text-slate-500">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Inbox className="mx-auto h-5 w-5 text-slate-600" aria-hidden="true" />
              <p className="mt-2 text-sm text-slate-400">Nothing waiting.</p>
              <p className="mt-1 text-xs text-slate-500">
                Payment, reminder, and security notes will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.link || "/notifications"}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]",
                      !notification.is_read && "bg-white/[0.02]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        notification.is_read ? "bg-slate-600" : "bg-cyan-300"
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-white">
                          {notification.title}
                        </span>
                        {notification.is_demo ? (
                          <span className="rounded bg-amber-400/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-200">
                            Demo
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-400">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-600">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/[0.08] p-2">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="focus-ring block rounded-lg px-3 py-2 text-center text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            Open notification center
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
