import Link from "next/link";
import { ArrowUpRight, Info, Lightbulb, TriangleAlert } from "lucide-react";
import type { Insight } from "@/types/database";
import { cn } from "@/lib/utils/cn";

const tones = {
  positive: {
    icon: Lightbulb,
    wrap: "border-emerald-300/15 bg-emerald-400/[0.04]",
    iconTone: "text-emerald-200 bg-emerald-400/10 ring-emerald-300/20",
  },
  warning: {
    icon: TriangleAlert,
    wrap: "border-amber-300/15 bg-amber-400/[0.04]",
    iconTone: "text-amber-200 bg-amber-400/10 ring-amber-300/20",
  },
  neutral: {
    icon: Info,
    wrap: "border-white/[0.07] bg-white/[0.025]",
    iconTone: "text-cyan-200 bg-cyan-400/10 ring-cyan-300/20",
  },
} as const;

export function InsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Agent insights</h2>
        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-200 ring-1 ring-inset ring-violet-400/20">
          Grounded
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Read from your own ledger. No prediction is treated as a promise.
      </p>

      <div className="mt-4 space-y-2.5">
        {insights.map((insight) => {
          const tone = tones[insight.tone] ?? tones.neutral;
          const Icon = tone.icon;
          return (
            <div key={insight.id} className={cn("rounded-xl border p-3.5", tone.wrap)}>
              <div className="flex gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1 ring-inset",
                    tone.iconTone
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-5 text-white">{insight.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{insight.detail}</p>
                  {insight.action ? (
                    <Link
                      href={insight.action.href}
                      className="focus-ring mt-2 inline-flex items-center gap-1 rounded text-[11px] font-medium text-cyan-300 transition-colors hover:text-cyan-200"
                    >
                      {insight.action.label}
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/ai-agent"
        className="focus-ring mt-4 flex items-center justify-between rounded-xl border border-violet-400/20 bg-violet-500/[0.07] px-3.5 py-2.5 text-xs font-medium text-violet-100 transition-colors hover:bg-violet-500/[0.12]"
      >
        Ask the agent for the next step
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
