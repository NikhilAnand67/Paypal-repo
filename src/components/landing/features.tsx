import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  HandCoins,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageSquareText,
    title: "Ask in plain language",
    copy: "Describe the invoice, the request, or the question. The agent maps it to a financial action with the details filled in.",
    tone: "text-violet-200",
  },
  {
    icon: ShieldCheck,
    title: "Review before anything runs",
    copy: "Every money moving action becomes a preview card with amount, currency, customer, and due date before you approve it.",
    tone: "text-emerald-200",
  },
  {
    icon: Wallet,
    title: "PayPal orders, wired in",
    copy: "Approved requests open a real PayPal Sandbox order through the Orders v2 API. No card data touches PayPilot.",
    tone: "text-cyan-200",
  },
  {
    icon: Database,
    title: "A ledger you can trust",
    copy: "Invoices, requests, and transactions live in Postgres with row level security. You only ever read your own records.",
    tone: "text-fuchsia-200",
  },
  {
    icon: Gauge,
    title: "Cash flow that makes sense",
    copy: "See collected totals, outstanding balances, and collection rate in one base currency, with excluded currencies called out.",
    tone: "text-amber-200",
  },
  {
    icon: HandCoins,
    title: "Built for the workday",
    copy: "Freelancers, creators, students, and small teams can send a request, follow up, and understand the month in minutes.",
    tone: "text-rose-200",
  },
];

const steps = [
  {
    number: "01",
    title: "Describe the outcome",
    copy: "Type what you need. PayPilot reads your own records and turns the request into a structured proposal.",
    icon: Sparkles,
  },
  {
    number: "02",
    title: "Review the prepared action",
    copy: "Check the amount, currency, customer, and due date. The server revalidates every field when you confirm.",
    icon: FileText,
  },
  {
    number: "03",
    title: "Choose how to collect",
    copy: "Send the request by email or open a PayPal Sandbox checkout. Webhooks keep the ledger in sync.",
    icon: CheckCircle2,
  },
];

export function Features() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="section-shell">
        <div className="max-w-2xl">
          <Badge tone="violet">Everything in one workspace</Badge>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
            Financial admin, reduced to a conversation.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-400">
            PayPilot keeps the intelligence and the ledger close together, so the answer and the
            action come from the same source of truth.
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors duration-300 hover:border-white/[0.14] hover:bg-white/[0.045] sm:p-6"
            >
              <span
                className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/[0.07] blur-2xl transition-opacity duration-300 group-hover:bg-violet-500/[0.12]"
                aria-hidden="true"
              />
              <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                <feature.icon className={`h-4.5 w-4.5 ${feature.tone}`} aria-hidden="true" />
              </span>
              <h3 className="relative mt-5 text-base font-semibold text-white">{feature.title}</h3>
              <p className="relative mt-2 text-sm leading-6 text-slate-400">{feature.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-20 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_40%,rgba(139,92,246,0.1),transparent_45%)]"
        aria-hidden="true"
      />
      <div className="section-shell relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Badge tone="cyan">Three deliberate steps</Badge>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              Speed without giving up the final say.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-400">
            The shortcut is in the preparation. The control stays with you at the exact moment it
            matters.
          </p>
        </div>

        <div className="relative mt-12 grid gap-3 lg:grid-cols-3">
          <div
            className="pointer-events-none absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent lg:block"
            aria-hidden="true"
          />
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative rounded-2xl border border-white/[0.07] bg-ink-925/80 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <span className="tabular text-xs font-semibold tracking-[0.18em] text-slate-600">
                  {step.number}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-200">
                  <step.icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <h3 className="mt-8 text-lg font-semibold tracking-[-0.01em] text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{step.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/login">
              Try the workspace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/demo">See the guided demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
