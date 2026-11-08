"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import type { Invoice } from "@/types/database";

type PayPalButtonsConfig = {
  style?: Record<string, string | number | boolean>;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
};

type PayPalButtonsInstance = {
  render: (target: HTMLElement) => Promise<void>;
  close?: () => void;
};

type PayPalNamespace = {
  Buttons: (config: PayPalButtonsConfig) => PayPalButtonsInstance;
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

function setupSteps() {
  return [
    "Create a PayPal Developer app in Sandbox mode.",
    "Add NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_ID to the environment.",
    "Add PAYPAL_CLIENT_SECRET and PAYPAL_WEBHOOK_ID on the server only.",
    "Restart the app, then reopen this checkout.",
  ];
}

function PayPalButtons({
  invoice,
  clientId,
  onCompleted,
}: {
  invoice: Invoice;
  clientId: string;
  onCompleted: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(onCompleted);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    completedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    let cancelled = false;

    function renderButtons() {
      if (!window.paypal || !containerRef.current) {
        setState("error");
        setMessage("The PayPal SDK loaded without the Buttons component.");
        return;
      }

      containerRef.current.innerHTML = "";
      const buttons = window.paypal.Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "paypal",
          height: 44,
          tagline: false,
        },
        createOrder: async () => {
          const response = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoiceId: invoice.id }),
          });
          const payload = (await response.json()) as {
            orderId?: string;
            error?: string;
            code?: string;
          };
          if (!response.ok || !payload.orderId) {
            const detail =
              payload.code === "paypal_not_configured"
                ? "PayPal server credentials are not configured yet."
                : payload.error ?? "The PayPal order could not be created.";
            toast.error(detail);
            throw new Error(detail);
          }
          return payload.orderId;
        },
        onApprove: async (data) => {
          setMessage("Capture in progress. PayPal is confirming the amount.");
          const response = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const payload = (await response.json()) as { error?: string; status?: string };
          if (!response.ok) {
            setMessage(payload.error ?? "The payment could not be captured.");
            toast.error(payload.error ?? "The payment could not be captured.");
            return;
          }
          toast.success("Sandbox payment captured. The ledger now reflects it.");
          completedRef.current();
        },
        onCancel: () => {
          setMessage("Checkout was closed before approval. Nothing was captured.");
        },
        onError: (error) => {
          setMessage(
            error instanceof Error
              ? error.message
              : "PayPal could not complete the checkout. Check the Sandbox app configuration."
          );
        },
      });

      setState("ready");
      buttons.render(containerRef.current).catch(() => {
        setState("error");
        setMessage("PayPal buttons could not render in this browser.");
      });

      return buttons;
    }

    if (window.paypal) {
      renderButtons();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=${encodeURIComponent(invoice.currency)}&intent=capture&components=buttons`;
    script.async = true;
    script.dataset.paypilot = "paypal-sdk";
    script.onload = () => {
      if (!cancelled) renderButtons();
    };
    script.onerror = () => {
      if (!cancelled) {
        setState("error");
        setMessage("The PayPal SDK could not load. Check your connection and client ID.");
      }
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [clientId, invoice.currency, invoice.id]);

  return (
    <div>
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <span className="text-xs text-slate-400">Amount to collect</span>
          <span className="tabular text-base font-semibold text-white">
            {formatCurrency(invoice.amount, invoice.currency)}
          </span>
        </div>
        <div className="mt-3">
          {state === "loading" ? (
            <div className="flex h-11 items-center justify-center gap-2 rounded-lg bg-white/[0.03] text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading PayPal Sandbox
            </div>
          ) : null}
          <div ref={containerRef} className={state === "ready" ? "min-h-11" : "hidden"} />
          {state === "error" ? (
            <p className="text-xs leading-5 text-rose-200" role="alert">
              {message ?? "PayPal is unavailable right now."}
            </p>
          ) : null}
        </div>
      </div>
      {message && state !== "error" ? (
        <p className="mt-3 text-xs leading-5 text-slate-400" role="status">
          {message}
        </p>
      ) : null}
      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300/80" aria-hidden="true" />
        The amount is read from the stored invoice on the server. The capture is compared with that
        amount before the ledger settles.
      </p>
    </div>
  );
}

export function PaypalCheckoutDialog({
  invoice,
  open,
  onOpenChange,
  clientId,
  onCompleted,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  onCompleted: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collect with PayPal Sandbox</DialogTitle>
          <DialogDescription>
            {invoice
              ? `Open a Sandbox order for ${invoice.invoice_number}. Buyer approval happens inside PayPal; PayPilot never sees card details.`
              : "Choose a record to collect."}
          </DialogDescription>
        </DialogHeader>

        {invoice ? (
          <>
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs">
              <div>
                <dt className="text-slate-500">Customer</dt>
                <dd className="mt-1 truncate font-medium text-white">{invoice.customer_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Currency</dt>
                <dd className="mt-1 font-medium text-white">{invoice.currency}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Due</dt>
                <dd className="mt-1 font-medium text-white">{invoice.due_date ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Record</dt>
                <dd className="mt-1 font-mono text-[11px] text-slate-300">{invoice.invoice_number}</dd>
              </div>
            </dl>

            {clientId ? (
              <PayPalButtons
                invoice={invoice}
                clientId={clientId}
                onCompleted={() => {
                  onOpenChange(false);
                  onCompleted();
                }}
              />
            ) : (
              <div className="rounded-xl border border-amber-300/20 bg-amber-400/[0.05] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  PayPal is not configured in this environment
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  The checkout integration is complete, but the public client ID is missing. The
                  ledger and the confirmation boundary still work without it.
                </p>
                <ol className="mt-3 space-y-1.5">
                  {setupSteps().map((step, index) => (
                    <li key={step} className="flex gap-2 text-xs leading-5 text-slate-400">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[9px] font-semibold text-slate-300">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <a
                  href="https://developer.paypal.com/dashboard/applications/sandbox"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded text-xs font-medium text-cyan-300 hover:text-cyan-200"
                >
                  Open the PayPal developer dashboard
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            )}
          </>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
