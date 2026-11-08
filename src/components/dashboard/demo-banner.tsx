"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DemoBanner({ hasDemoData }: { hasDemoData: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"seed" | "clear" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function seed() {
    setLoading("seed");
    try {
      const response = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Demonstration data could not be loaded.");
        return;
      }
      toast.success(payload.message ?? "Demonstration data loaded.");
      router.refresh();
      window.dispatchEvent(new Event("paypilot:notifications-updated"));
    } catch {
      toast.error("Demonstration data could not be loaded.");
    } finally {
      setLoading(null);
    }
  }

  async function clear() {
    setLoading("clear");
    try {
      const response = await fetch("/api/demo/clear", { method: "POST" });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Demonstration data could not be cleared.");
        return;
      }
      toast.success(payload.message ?? "Demonstration data cleared.");
      setConfirmOpen(false);
      router.refresh();
      window.dispatchEvent(new Event("paypilot:notifications-updated"));
    } catch {
      toast.error("Demonstration data could not be cleared.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-amber-400/[0.08] text-amber-200">
            <DatabaseZap className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">
              {hasDemoData ? "Demonstration data is active" : "Explore with demonstration data"}
            </p>
            <p className="mt-0.5 max-w-2xl text-xs leading-5 text-slate-400">
              {hasDemoData
                ? "Demo invoices, transactions, and notifications are flagged and kept separate from real Sandbox captures."
                : "Load a labeled sample ledger to explore the charts and agent without changing real records."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {hasDemoData ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              loading={loading === "clear"}
              disabled={loading !== null}
            >
              {loading !== "clear" ? <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              Clear demo data
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={seed}
              loading={loading === "seed"}
              disabled={loading !== null}
            >
              {loading !== "seed" ? <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              Load demo data
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove demonstration records?</DialogTitle>
            <DialogDescription>
              This removes only rows flagged as demonstration data. Real PayPal Sandbox captures and
              your own invoices stay untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Keep demo data
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={clear}
              disabled={loading === "clear"}
            >
              {loading === "clear" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Remove demo records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
