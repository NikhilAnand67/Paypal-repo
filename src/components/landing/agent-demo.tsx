"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  FileText,
  HandCoins,
  LineChart,
  Lock,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils/cn";

type Sample = {
  id: string;
  label: string;
  prompt: string;
  reply: string;
  action?: {
    kind: string;
    amount: string;
    detail: string;
    due: string;
    note: string;
  };
  icon: typeof FileText;
};

const samples: Sample[] = [
  {
    id: "request",
    label: "Create a request",
    prompt: "Create a $250 payment request for my website development client, due in seven days.",
    reply:
      "I prepared a payment request for $250.00 USD, due in seven days. The customer email is still missing, so I will keep the action pending until you add it. Nothing has been sent yet.",
    action: {
      kind: "Payment request",
      amount: "$250.00",
      detail: "Website development",
      due: "In 7 days",
      note: "Amount is rechecked on the server before any order is created.",
    },
    icon: HandCoins,
  },
  {
    id: "pending",
    label: "Review what is open",
    prompt: "Which invoices are still pending?",
    reply:
      "Two invoices and two payment requests are open. The oldest request is three days from its due date. I can prepare a reminder for that customer or show the full ledger.",
    icon: FileText,
  },
  {
    id: "analyze",
    label: "Understand cash flow",
    prompt: "Analyze my payment trends.",
    reply:
      "Collected totals increased in four of the last six months, while outstanding balances stayed concentrated in two customers. I would follow up on the request closest to its due date first.",
    icon: LineChart,
  },
];

export function AgentDemo() {
  const [active, setActive] = useState(samples[0]);

  return (
    <section id="agent" className="relative overflow-hidden py-20 sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_30%,rgba(34,211,238,0.12),transparent_46%)]"
        aria-hidden="true"
      />
      <div className="section-shell relative">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <div>
            <Badge tone="cyan">Agent workspace</Badge>
            <h2 className="mt-5 max-w-xl text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              A financial agent that prepares, never presumes.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              Ask for the outcome you need. PayPilot reads your own ledger, drafts the next step,
              and explains the reasoning. Financial execution waits for an explicit confirmation
              from you.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                {
                  icon: Wand2,
                  title: "Grounded in your records",
                  copy: "The agent only sees the invoices, requests, and transactions that belong to your signed in account.",
                },
                {
                  icon: Sparkles,
                  title: "Explains the prepared action",
                  copy: "Amount, customer, due date, currency, and the exact operation are shown before anything runs.",
                },
                {
                  icon: Lock,
                  title: "Confirmation is a hard boundary",
                  copy: "Approvals are revalidated on the server. The browser cannot invent an amount or skip the review.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3.5">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-200">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{item.copy}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Button asChild className="mt-8" variant="secondary">
              <Link href="/login">
                Open the agent
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[32px] bg-[radial-gradient(ellipse_at_50%_20%,rgba(139,92,246,0.22),transparent_65%)] blur-2xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/85 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">PayPilot agent</p>
                    <p className="text-[11px] text-slate-500">Simulated conversation</p>
                  </div>
                </div>
                <Badge tone="amber" className="hidden sm:inline-flex">
                  No execution without you
                </Badge>
              </div>

              <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06] px-4 py-3 sm:px-5">
                {samples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setActive(sample)}
                    className={cn(
                      "focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active.id === sample.id
                        ? "border-violet-400/30 bg-violet-500/15 text-violet-100"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                    )}
                    aria-pressed={active.id === sample.id}
                  >
                    <sample.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {sample.label}
                  </button>
                ))}
              </div>

              <div className="min-h-[420px] p-4 sm:p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-4"
                  >
                    <div className="flex justify-end">
                      <p className="max-w-[86%] rounded-2xl rounded-br-md border border-violet-400/20 bg-violet-500/15 px-4 py-3 text-sm leading-6 text-violet-50">
                        {active.prompt}
                      </p>
                    </div>

                    <div className="flex gap-2.5">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-cyan-200 ring-1 ring-inset ring-white/10">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.035] px-4 py-3">
                        <p className="text-sm leading-6 text-slate-300">{active.reply}</p>
                        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="status-dot text-emerald-400" aria-hidden="true" />
                          Read from your own ledger
                        </div>
                      </div>
                    </div>

                    {active.action ? (
                      <div className="ml-9 rounded-2xl border border-violet-400/20 bg-[linear-gradient(160deg,rgba(139,92,246,0.12),rgba(34,211,238,0.05))] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200">
                            {active.action.kind}
                          </span>
                          <Badge tone="amber" className="px-2 py-0.5 text-[10px]">
                            Awaiting confirmation
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="text-3xl font-semibold tracking-[-0.04em] text-white">
                              {active.action.amount}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">{active.action.detail}</p>
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            <p>USD</p>
                            <p className="mt-1 text-slate-300">{active.action.due}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <span className="grid h-9 place-items-center rounded-xl border border-white/10 text-xs font-medium text-slate-400">
                            Decline
                          </span>
                          <span className="grid h-9 place-items-center gap-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-xs font-semibold text-white">
                            <span className="inline-flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              Confirm
                            </span>
                          </span>
                        </div>
                        <p className="mt-2.5 text-[10px] leading-4 text-slate-500">{active.action.note}</p>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="border-t border-white/[0.06] px-4 py-3 sm:px-5">
                <p className="text-[10px] leading-4 text-slate-600">
                  Preview only. Responses shown here are illustrative and are not generated live.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
