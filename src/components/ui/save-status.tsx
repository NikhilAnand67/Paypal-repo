import { AlertCircle, Check, CloudUpload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveStatus({
  state,
  className,
  savedLabel = "All changes saved",
  idleLabel = "",
}: {
  state: SaveState;
  className?: string;
  savedLabel?: string;
  idleLabel?: string;
}) {
  if (state === "idle" && !idleLabel) return null;

  const config = {
    idle: { icon: CloudUpload, text: idleLabel, tone: "text-slate-500" },
    saving: { icon: Loader2, text: "Saving...", tone: "text-slate-400" },
    saved: { icon: Check, text: savedLabel, tone: "text-emerald-300" },
    error: { icon: AlertCircle, text: "Unable to save changes", tone: "text-rose-300" },
  }[state];

  const Icon = config.icon;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", config.tone, className)}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("h-3.5 w-3.5", state === "saving" && "animate-spin")} aria-hidden="true" />
      {config.text}
    </span>
  );
}
