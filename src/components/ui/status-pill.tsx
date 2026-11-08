import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { statusLabel } from "@/lib/utils/format";

const tones: Record<string, string> = {
  draft: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
  pending: "bg-amber-400/10 text-amber-200 ring-amber-300/25",
  paid: "bg-emerald-400/10 text-emerald-300 ring-emerald-300/25",
  completed: "bg-emerald-400/10 text-emerald-300 ring-emerald-300/25",
  overdue: "bg-rose-400/10 text-rose-300 ring-rose-300/25",
  cancelled: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
  created: "bg-cyan-400/10 text-cyan-200 ring-cyan-300/25",
  approved: "bg-violet-400/10 text-violet-200 ring-violet-300/25",
  failed: "bg-rose-400/10 text-rose-300 ring-rose-300/25",
  refunded: "bg-fuchsia-400/10 text-fuchsia-200 ring-fuchsia-300/25",
  executed: "bg-emerald-400/10 text-emerald-300 ring-emerald-300/25",
  declined: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
  expired: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
  pending_confirmation: "bg-amber-400/10 text-amber-200 ring-amber-300/25",
  default: "bg-white/[0.05] text-slate-300 ring-white/10",
};

export function StatusPill({
  status,
  label,
  className,
  pulse,
}: {
  status: string;
  label?: string;
  className?: string;
  pulse?: boolean;
}) {
  const tone = tones[status] ?? tones.default;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tone,
        className
      )}
    >
      <span className={cn("status-dot", pulse && "animate-pulse")} aria-hidden="true" />
      {label ?? statusLabel(status)}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "violet" | "cyan" | "emerald" | "amber" | "rose";
  className?: string;
}) {
  const map = {
    neutral: "bg-white/[0.05] text-slate-300 ring-white/10",
    violet: "bg-violet-500/10 text-violet-200 ring-violet-400/25",
    cyan: "bg-cyan-400/10 text-cyan-200 ring-cyan-300/25",
    emerald: "bg-emerald-400/10 text-emerald-200 ring-emerald-300/25",
    amber: "bg-amber-400/10 text-amber-200 ring-amber-300/25",
    rose: "bg-rose-400/10 text-rose-200 ring-rose-300/25",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        map[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
