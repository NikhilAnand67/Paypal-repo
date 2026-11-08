"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/status-pill";
import { Switch } from "@/components/ui/primitives";
import { CURRENCIES } from "@/lib/constants";
import { formatDateTime, initials, providerLabel, titleCase } from "@/lib/utils/format";
import type { AuditLog, Currency, Profile } from "@/types/database";
import type { IntegrationStatus } from "@/lib/config/status";

type ProfileState = {
  full_name: string;
  avatar_url: string;
  currency: Currency;
  email_notifications: boolean;
  payment_notifications: boolean;
  security_alerts: boolean;
  marketing_updates: boolean;
};

const auditLabels: Record<string, string> = {
  login_success: "Signed in",
  logout: "Signed out",
  sign_out: "Signed out",
  profile_updated: "Profile updated",
  invoice_created: "Invoice created",
  invoice_updated: "Invoice updated",
  invoice_deleted: "Invoice deleted",
  payment_request_created: "Payment request created",
  payment_captured: "PayPal payment captured",
  paypal_order_created: "PayPal order created",
  agent_action_declined: "Agent action declined",
  agent_action_expired: "Agent preview expired",
  agent_conversation_deleted: "Conversation deleted",
  payment_reminder_sent: "Reminder sent",
  demo_data_seeded: "Demo data loaded",
  demo_data_cleared: "Demo data cleared",
  notification_deleted: "Notification deleted",
};

function auditLabel(action: string) {
  return auditLabels[action] ?? titleCase(action.replaceAll("_", " "));
}

function statusTone(ready: boolean) {
  return ready ? ("emerald" as const) : ("amber" as const);
}

export function SettingsForm({
  profile,
  email,
  provider,
  status,
  activity,
  activityError,
}: {
  profile: Profile | null;
  email: string;
  provider: string;
  status: IntegrationStatus;
  activity: AuditLog[];
  activityError: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<ProfileState>({
    full_name: profile?.full_name ?? "",
    avatar_url: profile?.avatar_url ?? "",
    currency: (profile?.currency ?? "USD") as Currency,
    email_notifications: profile?.email_notifications ?? true,
    payment_notifications: profile?.payment_notifications ?? true,
    security_alerts: profile?.security_alerts ?? true,
    marketing_updates: profile?.marketing_updates ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const name = state.full_name || email.split("@")[0] || "Your account";
  const showAvatar = state.avatar_url.startsWith("https://") && !avatarBroken;

  function update<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setState((previous) => ({ ...previous, [key]: value }));
  }

  async function save() {
    if (!state.full_name.trim()) {
      toast.error("Add your name before saving.");
      return;
    }
    if (state.avatar_url.trim() && !state.avatar_url.trim().startsWith("https://")) {
      toast.error("Avatar must be an HTTPS image URL.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: state.full_name.trim(),
          avatar_url: state.avatar_url.trim(),
          currency: state.currency,
          email_notifications: state.email_notifications,
          payment_notifications: state.payment_notifications,
          security_alerts: state.security_alerts,
          marketing_updates: state.marketing_updates,
        }),
      });
      const payload = (await response.json()) as { error?: string; code?: string };
      if (!response.ok) {
        toast.error(
          payload.code === "profile_unavailable"
            ? "Profile is not available. Apply the database migration first."
            : payload.error ?? "Those changes could not be saved."
        );
        return;
      }
      toast.success("Settings saved.");
      router.refresh();
    } catch {
      toast.error("Those changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/auth/signout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Sign out failed. Try again.");
      setSigningOut(false);
    }
  }

  const integrations = [
    {
      label: "Supabase auth and database",
      ready: status.supabase,
      detail: "Project URL and publishable key present. RLS enforces row ownership.",
    },
    {
      label: "PayPal Orders API",
      ready: status.paypal,
      detail: "Create and capture run on the server with stored amounts.",
    },
    {
      label: "PayPal webhook verification",
      ready: status.paypalWebhook,
      detail: "Webhook signatures are verified before any ledger update.",
    },
    {
      label: "Gemini reasoning",
      ready: status.gemini,
      detail: "Without a key, the deterministic local planner handles requests.",
    },
    {
      label: "Resend email",
      ready: status.resend,
      detail: "Receipts, reminders, and login alerts are skipped when unconfigured.",
    },
    {
      label: "Service role key",
      ready: status.serviceRole,
      detail: "Server only. Never exposed through NEXT_PUBLIC variables.",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Profile</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            This name appears in the workspace, emails, and receipts.
          </p>

          <div className="mt-5 flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/25 to-cyan-400/15 text-lg font-semibold text-white">
              {showAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.avatar_url}
                  alt={`${name} avatar`}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                initials(name, email)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <Field label="Avatar image URL" htmlFor="avatar-url" hint="Must start with https://">
                <Input
                  id="avatar-url"
                  value={state.avatar_url}
                  onChange={(event) => {
                    setAvatarBroken(false);
                    update("avatar_url", event.target.value);
                  }}
                  placeholder="https://example.com/avatar.png"
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="full-name">
              <Input
                id="full-name"
                value={state.full_name}
                onChange={(event) => update("full_name", event.target.value)}
                placeholder="Your name"
              />
            </Field>
            <Field label="Base currency" htmlFor="base-currency" hint="No FX conversion is applied">
              <Select
                id="base-currency"
                value={state.currency}
                onChange={(event) => update("currency", event.target.value as Currency)}
              >
                {CURRENCIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} · {item.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <dl className="mt-5 grid gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="flex items-center gap-1.5 text-slate-500">
                <Mail className="h-3 w-3" aria-hidden="true" />
                Email
              </dt>
              <dd className="mt-1 truncate text-slate-200">{email}</dd>
            </div>
            <div className="min-w-0">
              <dt className="flex items-center gap-1.5 text-slate-500">
                <KeyRound className="h-3 w-3" aria-hidden="true" />
                Sign in method
              </dt>
              <dd className="mt-1 text-slate-200">{providerLabel(provider)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={save} loading={saving}>
              {saving ? null : <Save className="h-4 w-4" aria-hidden="true" />}
              Save changes
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-amber-200" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white">Notifications</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Email delivery requires RESEND_API_KEY on the server.
            </p>

            <div className="mt-4 space-y-1">
              {(
                [
                  {
                    key: "email_notifications",
                    label: "Account email",
                    description: "Receipts and records created by the agent.",
                  },
                  {
                    key: "payment_notifications",
                    label: "Payment updates",
                    description: "Captures, refunds, and failed payments.",
                  },
                  {
                    key: "security_alerts",
                    label: "Security activity",
                    description: "Sign ins and sensitive account changes.",
                  },
                  {
                    key: "marketing_updates",
                    label: "Product updates",
                    description: "Occasional notes about new PayPilot features.",
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 rounded-xl px-1 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white">{item.label}</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{item.description}</p>
                  </div>
                  <Switch
                    checked={state[item.key]}
                    onCheckedChange={(checked) => update(item.key, checked)}
                    aria-label={item.label}
                    className="mt-0.5"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">Payments</h2>
              </div>
              <Badge tone={status.sandbox ? "cyan" : "rose"}>
                {status.sandbox ? "Sandbox only" : "Live mode blocked"}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Checkout always reads the stored invoice amount on the server. Captured amounts are
              compared before the ledger settles, and live mode stays disabled for this hackathon
              build.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-violet-200" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Security activity</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Audit records are append only and scoped to your account.
          </p>

          {activityError ? (
            <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-400/[0.05] px-4 py-3 text-xs leading-5 text-amber-100">
              Activity is not available until the database migration is applied.
            </p>
          ) : activity.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">No recorded activity yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {activity.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white">{auditLabel(log.action)}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {log.resource_type ? `${titleCase(log.resource_type.replaceAll("_", " "))} · ` : ""}
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Integrations</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Booleans computed on the server. Secrets never reach the browser.
          </p>

          <ul className="mt-4 space-y-2">
            {integrations.map((integration) => (
              <li
                key={integration.label}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
              >
                <span className="mt-0.5">
                  {integration.ready ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <Loader2 className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-white">{integration.label}</p>
                    <Badge tone={statusTone(integration.ready)}>
                      {integration.ready ? "Ready" : "Setup needed"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{integration.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-rose-300/15 bg-rose-400/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Sign out</h2>
          <p className="mt-1 text-xs text-slate-500">
            End this session on this device. Other sessions stay active.
          </p>
        </div>
        <Button type="button" variant="danger" onClick={signOut} loading={signingOut}>
          {signingOut ? null : <LogOut className="h-4 w-4" aria-hidden="true" />}
          Sign out
        </Button>
      </div>
    </div>
  );
}
