import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CircleDollarSign,
  Lock,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyRain } from "@/components/three/money-rain";
import { Badge } from "@/components/ui/status-pill";

const chart = [
  { label: "May", value: 34 },
  { label: "Jun", value: 46 },
  { label: "Jul", value: 41 },
  { label: "Aug", value: 62 },
  { label: "Sep", value: 55 },
  { label: "Oct", value: 78 },
];

export function Hero() {
  return (
    <section id="product" className="relative overflow-hidden pb-20 pt-32 sm:pt-40">
      <MoneyRain variant="hero" density={24} />

      <div className="section-shell relative">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md">
            <span className="status-dot text-emerald-400" aria-hidden="true" />
            PayPal Sandbox
            <span className="text-slate-600">/</span>
            Gemini reasoning
            <span className="text-slate-600">/</span>
            Your approval
          </div>

          <h1 className="mt-8 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-gradient sm:text-6xl lg:text-7xl">
            <span className="block">Your money.</span>
            <span className="block">Your AI.</span>
            <span className="block text-gradient-violet">Your control.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            PayPilot turns plain language into prepared invoices, payment requests, and clear cash
            flow insight. Review every action before it runs. Nothing leaves your account by
            surprise.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/login">
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
              <Link href="/demo">
                Explore the demo
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Sandbox only
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Server verified amounts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              No card details stored
            </span>
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl sm:mt-16">
          <div
            className="pointer-events-none absolute -inset-x-12 -top-12 bottom-0 rounded-[40px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.28),transparent_62%)] blur-2xl"
            aria-hidden="true"
          />
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.035] p-2 shadow-[0_50px_140px_-50px_rgba(0,0,0,0.95)] backdrop-blur-xl">
            <div className="rounded-2xl border border-white/[0.07] bg-ink-925/95">
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                  <span className="hidden sm:inline">PayPilot workspace</span>
                  <Badge tone="emerald" className="px-2 py-0.5 text-[10px]">
                    Sandbox
                  </Badge>
                </div>
                <span className="text-[11px] text-slate-600">Illustrative preview</span>
              </div>

              <div className="grid gap-3 p-3 sm:gap-4 sm:p-5 lg:grid-cols-[1.35fr_1fr]">
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: "Collected", value: "$18,420", icon: CircleDollarSign, tone: "text-emerald-300" },
                      { label: "Outstanding", value: "$3,205", icon: Wallet, tone: "text-amber-200" },
                      { label: "Collected rate", value: "86%", icon: TrendingUp, tone: "text-cyan-200" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5 sm:p-3.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-[10px] uppercase tracking-[0.12em] text-slate-500 sm:text-[11px]">
                            {stat.label}
                          </span>
                          <stat.icon className={`h-3.5 w-3.5 shrink-0 ${stat.tone}`} aria-hidden="true" />
                        </div>
                        <p className="tabular mt-2 text-lg font-semibold tracking-[-0.02em] text-white sm:text-2xl">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 sm:p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-300">Cash collected</p>
                      <span className="text-[11px] text-emerald-300">Last 6 months</span>
                    </div>
                    <div className="mt-4 flex h-24 items-end gap-2 sm:h-28">
                      {chart.map((point) => (
                        <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
                          <div className="flex w-full flex-1 items-end">
                            <div
                              className="w-full rounded-t-md bg-gradient-to-t from-violet-600/40 via-violet-500/60 to-cyan-300/80"
                              style={{ height: `${point.value}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-600">{point.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 sm:p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-400/25">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white">PayPilot agent</p>
                      <p className="text-[10px] text-slate-500">Action ready for review</p>
                    </div>
                  </div>

                  <p className="mt-3 rounded-lg rounded-tl-sm border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-[11px] leading-5 text-slate-300">
                    Create a $250 payment request for my website development client, due in seven
                    days.
                  </p>

                  <div className="mt-3 rounded-lg border border-violet-400/20 bg-violet-500/[0.07] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-violet-200">
                        Payment request
                      </span>
                      <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-200 ring-1 ring-inset ring-amber-300/20">
                        Awaiting you
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">$250.00</p>
                    <div className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                      <p className="flex items-center justify-between gap-2">
                        <span>Website development</span>
                        <span className="text-slate-500">USD</span>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span>Client</span>
                        <span className="text-slate-300">Northwind Studio</span>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span>Due</span>
                        <span className="text-slate-300">In 7 days</span>
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <span className="grid h-8 place-items-center rounded-lg border border-white/10 text-[11px] font-medium text-slate-400">
                        Decline
                      </span>
                      <span className="grid h-8 place-items-center rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[11px] font-semibold text-white">
                        Confirm
                      </span>
                    </div>
                    <p className="mt-2 text-center text-[10px] text-slate-500">
                      Amount is rechecked on the server.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
