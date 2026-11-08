import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-14 text-center",
        className
      )}
    >
      <div className="relative mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <span className="absolute inset-0 rounded-2xl bg-violet-500/10 blur-lg" aria-hidden="true" />
        <Icon className="relative h-5 w-5 text-violet-300" aria-hidden="true" />
      </div>
      <h3 className="max-w-sm text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
