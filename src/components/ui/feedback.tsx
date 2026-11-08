import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden="true" />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function ProgressBar({
  value,
  className,
  tone = "violet",
}: {
  value: number;
  className?: string;
  tone?: "violet" | "cyan" | "emerald";
}) {
  const tones = {
    violet: "from-violet-500 to-fuchsia-400",
    cyan: "from-cyan-400 to-sky-400",
    emerald: "from-emerald-400 to-teal-300",
  } as const;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]", tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
