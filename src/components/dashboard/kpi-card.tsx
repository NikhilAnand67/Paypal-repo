import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ProgressBar } from "@/components/ui/feedback";

const tones = {
  violet: "text-violet-200 bg-violet-500/10 ring-violet-400/20",
  cyan: "text-cyan-200 bg-cyan-400/10 ring-cyan-300/20",
  emerald: "text-emerald-200 bg-emerald-400/10 ring-emerald-300/20",
  amber: "text-amber-200 bg-amber-400/10 ring-amber-300/20",
  rose: "text-rose-200 bg-rose-400/10 ring-rose-300/20",
} as const;

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "violet",
  progress,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  progress?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset", tones[tone])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="tabular mt-4 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[28px]">
        {value}
      </p>
      {typeof progress === "number" ? <ProgressBar value={progress} className="mt-3" tone={tone === "emerald" ? "emerald" : tone === "cyan" ? "cyan" : "violet"} /> : null}
      {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}
