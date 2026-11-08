import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ProgressBar } from "@/components/ui/feedback";
import { InfoTip } from "@/components/ui/info-tip";

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
  detail,
  icon: Icon,
  tone = "violet",
  progress,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  detail?: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  progress?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "premium-panel premium-lift group relative overflow-hidden rounded-2xl p-5",
        className
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>
          {detail ? <InfoTip label={label}>{detail}</InfoTip> : null}
        </span>
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
