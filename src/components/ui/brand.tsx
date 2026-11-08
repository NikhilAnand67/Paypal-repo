import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function BrandMark({ className, size = 34 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_8px_24px_-8px_rgba(139,92,246,0.8)]",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_55%)]" />
      <svg viewBox="0 0 24 24" className="relative" width={size * 0.58} height={size * 0.58} fill="none">
        <path d="M3.5 19.2 12 3.6l8.5 15.6-8.5-4.1-8.5 4.1Z" fill="white" />
        <path d="M12 15.1v5.3" stroke="rgba(6,6,11,0.32)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 rounded-[10px] ring-1 ring-inset ring-white/25" />
    </span>
  );
}

export function Logo({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("focus-ring inline-flex items-center gap-2.5 rounded-lg", className)}
      aria-label="PayPilot AI home"
    >
      <BrandMark size={34} />
      {!compact ? (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[17px] font-semibold tracking-[-0.03em] text-white">PayPilot</span>
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200 ring-1 ring-inset ring-white/10">
            AI
          </span>
        </span>
      ) : null}
    </Link>
  );
}
