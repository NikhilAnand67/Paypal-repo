"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border-white/10 !bg-[#0e0e19]/95 !text-slate-100 !shadow-2xl !backdrop-blur-xl",
          description: "!text-slate-400",
          actionButton: "!bg-violet-500 !text-white",
          closeButton: "!border-white/10 !bg-[#0e0e19] !text-slate-400",
        },
      }}
    />
  );
}
