"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileText,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/status-pill";
import { Logo } from "@/components/ui/brand";
import { cn } from "@/lib/utils/cn";

type Visual = "dashboard" | "chat" | "action" | "record" | "paypal" | "analytics" | "security" | "demo";

const steps: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: Visual;
  href?: string;
}[] = [
  {
    eyebrow: "Step 1 of 12",
    title: "A financial copilot with a brake pedal",
    body: "PayPilot AI reads your own invoices, requests, and PayPal captures. It can prepare work, but it never moves money on its own.",
    bullets: [
      "Natural language in, structured financial actions out",
      "Every proposal is shown before it runs",
      "The server re-validates every confirmed action",
    ],
    visual: "dashboard",
  },
  {
    eyebrow: "Step 2 of 12",
    title: "Your account, your rows",
    body: "Supabase Auth identifies you, and row level security limits every query to records you own. The publishable key is safe in the browser only because RLS is enforced in the database.",
    bullets: [
      "Google, GitHub, and email sign in",
      "RLS policies on every table",
      "The service role key never reaches the client",
    ],
    visual: "security",
  },
  {
    eyebrow: "Step 3 of 12",
    title: "A dashboard built from stored records",
    body: "Collected totals, outstanding balances, collection rate, and average payment are computed from your ledger. Nothing is estimated by the UI.",
    bullets: [
      "Mixed currencies are excluded, never converted with invented rates",
      "Demo rows carry an is_demo flag everywhere",
      "The cash flow chart shows collected and outstanding values",
    ],
    visual: "dashboard",
    href: "/dashboard",
  },
  {
    eyebrow: "Step 4 of 12",
    title: "Ask in plain language",
    body: "Try: create a $250 payment request for my website development client, due in seven days. The agent parses amount, customer, scope, and due date.",
    bullets: [
      "Gemini structured output when GEMINI_API_KEY is present",
      "A deterministic local planner fills in when it is not",
      "The agent sees only a compact snapshot of your ledger",
    ],
    visual: "chat",
  },
  {
    eyebrow: "Step 5 of 12",
    title: "The proposal is a form, not a promise",
    body: "The action preview lists the exact customer, amount, currency, due date, and description. Every field can be adjusted before you confirm.",
    bullets: [
      "Amounts and currency are editable",
      "Missing fields are called out clearly",
      "The preview is saved before you decide",
    ],
    visual: "action",
  },
  {
    eyebrow: "Step 6 of 12",
    title: "Explicit confirmation is the boundary",
    body: "Nothing executes until you press Confirm and run inside a dedicated confirmation dialog. Declining leaves every record untouched.",
    bullets: [
      "Pending actions expire after 24 hours",
      "Declines are audited",
      "The API rejects execution without confirmed: true",
    ],
    visual: "action",
  },
  {
    eyebrow: "Step 7 of 12",
    title: "A real record is written",
    body: "On confirmation the server validates the fields again, assigns the next invoice number, saves the record, audits it, and notifies you.",
    bullets: [
      "Drafts stay drafts until you act",
      "Payment requests open as pending",
      "The record links back from notifications and search",
    ],
    visual: "record",
    href: "/invoices",
  },
  {
    eyebrow: "Step 8 of 12",
    title: "PayPal Sandbox opens next",
    body: "Collecting a record creates a PayPal order from the stored amount. The browser never decides what to charge.",
    bullets: [
      "OAuth client credentials on the server",
      "Approval links come from PayPal",
      "Live mode is blocked in this build",
    ],
    visual: "paypal",
  },
  {
    eyebrow: "Step 9 of 12",
    title: "Capture, compare, settle",
    body: "After buyer approval, the server captures the order and compares the captured amount and currency with the stored record before marking it paid.",
    bullets: [
      "Idempotent settlement",
      "Webhook signatures verified",
      "Failures are recorded, never hidden",
    ],
    visual: "paypal",
    href: "/payment-requests",
  },
  {
    eyebrow: "Step 10 of 12",
    title: "Analytics without fiction",
    body: "Trends, status breakdowns, and top customers come from your records. If a currency does not match your base currency, it is excluded and called out.",
    bullets: [
      "No invented exchange rates",
      "No hardcoded payment history",
      "Demo data is visually labeled in every table",
    ],
    visual: "analytics",
    href: "/analytics",
  },
  {
    eyebrow: "Step 11 of 12",
    title: "Search, notifications, and audit",
    body: "Command K searches your invoices and transactions. Notifications follow real events. Audit records capture sensitive changes and are append only.",
    bullets: [
      "Server side search with authorization",
      "Unread counts update across the workspace",
      "Security activity is visible in settings",
    ],
    visual: "security",
    href: "/notifications",
  },
  {
    eyebrow: "Step 12 of 12",
    title: "Demo data stays in its lane",
    body: "Loading the guided workspace creates invoices, requests, transactions, and notifications marked is_demo. Clearing removes only those rows.",
    bullets: [
      "Real Sandbox captures are never mixed with demo rows",
      "Clear demo data from the dashboard banner",
      "Try the agent, then confirm a real change yourself",
    ],
    visual: "demo",
    href: "/settings",
  },
];

function VisualPanel({ visual }: { visual: Visual }) {
  if (visual === "chat") {
    return (
      <div className="space-y-3">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-violet-400/20 bg-violet-500/[0.12] px-4 py-3 text-xs leading-5 text-white">
          Create a $250 payment request for my website development client, due in seven days.
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <p className="text-xs leading-5 text-slate-300">
            I prepared a $250.00 payment request for the website development work, due in seven
            days. Review the preview and confirm to save it.
          </p>
          <p className="mt-2 text-[10px] text-slate-600">Nothing is sent or charged without your approval.</p>
        </div>
      </div>
    );
  }

  if (visual === "action") {
    return (
      <div className="overflow-hidden rounded-2xl border border-violet-400/25 bg-violet-500/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-400/10 text-emerald-200 ring-1 ring-inset ring-emerald-300/20">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <p className="text-xs font-semibold text-white">Payment request</p>
          <Badge tone="amber" className="ml-auto">Waiting for you</Badge>
        </div>
        <dl className="grid gap-2 p-4 text-[11px]">
          {[
            ["Customer", "Website development client"],
            ["Amount", "$250.00 USD"],
            ["Due", "In seven days"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-medium text-white">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3">
          <span className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-[11px] font-semibold text-white">
            Review and confirm
          </span>
          <span className="text-[11px] text-slate-500">Not now</span>
        </div>
      </div>
    );
  }

  if (visual === "record") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <p className="text-xs font-semibold text-white">INV-2041 · Website development</p>
          <Badge tone="emerald" className="ml-auto">Saved</Badge>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">$250.00</p>
        <p className="mt-1 text-[11px] text-slate-500">Website development client · due in seven days</p>
        <div className="mt-4 space-y-2">
          {["Validated on the server", "Audited with the action id", "Notification pushed to your workspace"].map(
            (item) => (
              <p key={item} className="flex items-center gap-2 text-[11px] text-slate-400">
                <CheckCircle2 className="h-3 w-3 text-emerald-300" aria-hidden="true" />
                {item}
              </p>
            )
          )}
        </div>
      </div>
    );
  }

  if (visual === "paypal") {
    return (
      <div className="space-y-2">
        {[
          { label: "Record stored", copy: "The amount and currency live in your database.", done: true },
          { label: "Server creates the order", copy: "PayPal receives the stored amount, not a browser value.", done: true },
          { label: "Buyer approves", copy: "Approval happens inside PayPal Sandbox.", done: false },
          { label: "Server captures and compares", copy: "Mismatches never settle the ledger.", done: false },
        ].map((step, index) => (
          <div
            key={step.label}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-3.5 py-3",
              step.done
                ? "border-emerald-300/20 bg-emerald-400/[0.04]"
                : "border-white/[0.07] bg-white/[0.02]"
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                step.done ? "bg-emerald-400/15 text-emerald-200" : "bg-white/[0.06] text-slate-400"
              )}
            >
              {index + 1}
            </span>
            <div>
              <p className="text-xs font-medium text-white">{step.label}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{step.copy}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (visual === "analytics") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-200" aria-hidden="true" />
          <p className="text-xs font-semibold text-white">Cash flow</p>
          <Badge tone="cyan" className="ml-auto">USD</Badge>
        </div>
        <div className="mt-4 flex h-32 items-end gap-2">
          {[38, 54, 46, 68, 60, 82].map((height, index) => (
            <div key={index} className="flex-1">
              <div
                className="rounded-t-md bg-gradient-to-t from-violet-500/25 to-violet-400"
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[9px] text-slate-600">
          {["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((month) => (
            <span key={month}>{month}</span>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-4 text-slate-500">
          Computed from stored captures. Other currencies are excluded, never converted.
        </p>
      </div>
    );
  }

  if (visual === "security") {
    return (
      <div className="space-y-2">
        {[
          { icon: Lock, label: "Row level security", detail: "Each query is scoped to your user id." },
          { icon: ShieldCheck, label: "Append only audit", detail: "Sensitive actions keep a permanent trail." },
          { icon: Database, label: "Server verified amounts", detail: "The browser never decides what to charge." },
          { icon: Layers, label: "Demo isolation", detail: "is_demo rows never blend into real captures." },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3"
          >
            <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-white">{item.label}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (visual === "demo") {
    return (
      <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.04] p-4">
        <div className="flex items-center gap-2">
          <span className="rounded bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            Demo
          </span>
          <p className="text-xs font-semibold text-white">Guided workspace</p>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-400">
          Ten invoices, seven transactions, and four notifications are created with is_demo set to
          true. They are labeled in every table and can be removed without touching real Sandbox
          captures.
        </p>
        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500">
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          Clear demo data from the dashboard at any time.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Collected", "$1,480.00", "text-emerald-200"],
          ["Outstanding", "$920.00", "text-amber-200"],
          ["Collection rate", "62%", "text-cyan-200"],
          ["Average payment", "$296.00", "text-violet-200"],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
            <p className="text-[9px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className={cn("mt-1 text-base font-semibold", tone)}>{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
        <p className="text-[10px] text-slate-500">Collected and outstanding, last six months</p>
        <div className="mt-3 flex h-20 items-end gap-1.5">
          {[30, 45, 38, 62, 54, 74].map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-violet-500/20 to-violet-400/80"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DemoExperience({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  async function seedDemo() {
    setBusy("seed");
    try {
      const response = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Demo data could not be loaded.");
        return;
      }
      toast.success(payload.message ?? "Demo workspace loaded.");
      router.push("/dashboard");
    } catch {
      toast.error("Demo data could not be loaded.");
    } finally {
      setBusy(null);
    }
  }

  async function clearDemo() {
    setBusy("clear");
    try {
      const response = await fetch("/api/demo/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Demo data could not be cleared.");
        return;
      }
      toast.success(payload.message ?? "Demo data cleared.");
      router.refresh();
    } catch {
      toast.error("Demo data could not be cleared.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-dvh bg-ink-950 text-white">
      <div className="pointer-events-none fixed inset-0 grid-lines opacity-40" aria-hidden="true" />
      <header className="relative z-10 border-b border-white/[0.07] bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <span className="hidden rounded-md bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200 ring-1 ring-inset ring-cyan-300/20 sm:inline">
            Guided demo
          </span>
          <div className="ml-auto flex items-center gap-2">
            {signedIn ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard">Open workspace</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/login?next=/demo">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-200" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
                {step.eyebrow}
              </p>
            </div>

            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {step.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">{step.body}</p>

            <ul className="mt-6 space-y-2.5">
              {step.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-xs leading-5 text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/80" aria-hidden="true" />
                  {bullet}
                </li>
              ))}
            </ul>

            {step.href ? (
              signedIn ? (
                <Link
                  href={step.href}
                  className="focus-ring mt-5 inline-flex items-center gap-1.5 rounded text-xs font-medium text-cyan-300 hover:text-cyan-200"
                >
                  Open this page
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null
            ) : null}

            <div className="mt-8">
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${((index + 1) / steps.length) * 100}%` }}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIndex((value) => Math.max(value - 1, 0))}
                  disabled={index === 0}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIndex((value) => Math.min(value + 1, steps.length - 1))}
                  disabled={last}
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <div className="ml-auto flex items-center gap-1.5">
                  {steps.map((item, stepIndex) => (
                    <button
                      key={item.eyebrow}
                      type="button"
                      onClick={() => setIndex(stepIndex)}
                      aria-label={`Go to step ${stepIndex + 1}`}
                      aria-current={stepIndex === index ? "step" : undefined}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        stepIndex === index ? "w-5 bg-cyan-300" : "w-1.5 bg-white/20 hover:bg-white/40"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <p className="text-xs font-semibold text-white">
                {signedIn ? "Try it with isolated demo data" : "Sign in to run the guided workspace"}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {signedIn
                  ? "Loading demo data creates clearly labeled records in your own account. You can remove them at any time."
                  : "The live demo needs a session so every record is scoped to you. The tour above explains the full flow without an account."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {signedIn ? (
                  <>
                    <Button type="button" size="sm" onClick={seedDemo} disabled={busy !== null}>
                      {busy === "seed" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Load demo workspace
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={clearDemo}
                      disabled={busy !== null}
                    >
                      {busy === "clear" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Clear demo data
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="sm">
                      <Link href="/login?next=/demo">Sign in to try it</Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm">
                      <Link href="/">Back to the product</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_20%_0%,rgba(139,92,246,0.16),transparent_55%),rgba(255,255,255,0.02)] p-4 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  <MessageSquare className="h-3 w-3" aria-hidden="true" />
                  Illustrative preview
                </span>
                <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-slate-400">
                  Sandbox
                </span>
              </div>
              <VisualPanel visual={step.visual} />
            </div>
            <p className="mt-3 text-center text-[10px] leading-4 text-slate-600">
              Preview values are illustrative. Live data comes only from your ledger.
            </p>
          </div>
        </div>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 text-[11px] text-slate-500">
          <p>PayPilot AI · PayPal Sandbox demonstration</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="focus-ring rounded hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="focus-ring rounded hover:text-white">
              Terms
            </Link>
            <Link href="/" className="focus-ring rounded hover:text-white">
              Product
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
