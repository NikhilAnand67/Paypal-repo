"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/primitives";

export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="focus-ring grid h-4 w-4 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:text-slate-300"
            aria-label={`About ${label}`}
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs leading-5">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
