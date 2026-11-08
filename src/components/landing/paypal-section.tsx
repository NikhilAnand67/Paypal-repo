import { ArrowRight, CheckCircle2, Code2, Lock, ShieldCheck, Webhook } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

const flow = [
  {
    label: "Order created",
    detail: "The server reads the invoice amount and opens a PayPal Sandbox order.",
    status: "POST /v2/checkout/orders",
  },
  {
    label: "Buyer approved",
    detail: "The payer approves inside the PayPal flow. No card data reaches PayPilot.",
    status: "PayPal JS SDK",
  },
  {
    label: "Capture verified",
    detail: "The captured amount and currency are compared with the stored invoice.",
    status: "POST /capture",
  },
  {
    label: "Ledger settled",
    detail: "A verified webhook marks the invoice paid and writes the transaction once.",
    status: "PAYMENT.CAPTURE.COMPLETED",
  },
];

export function PaypalSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_50%,rgba(34,211,238,0.1),transparent_45%)]"
        aria-hidden="true"
      />
      <div className="section-shell relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <Badge tone="cyan">PayPal integration</Badge>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              Real payment infrastructure, held inside the Sandbox.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              PayPilot uses the PayPal Orders v2 API for every checkout. Amounts are read from the
              stored invoice on the server, never from the browser, and the capture must match
              before the ledger changes.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: Lock,
                  title: "Server side amounts",
                  copy: "The browser sends an invoice reference, not a price.",
                },
                {
                  icon: Webhook,
                  title: "Verified webhooks",
                  copy: "Signatures are checked before records settle.",
                },
                {
                  icon: ShieldCheck,
                  title: "Idempotent capture",
                  copy: "Repeat callbacks never double count a payment.",
                },
                {
                  icon: CheckCircle2,
                  title: "Sandbox only",
                  copy: "Live hosts stay off unless an operator opts in.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
                >
                  <item.icon className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{item.copy}</p>
                </div>
              ))}
            </div>

            <Button asChild variant="secondary" className="mt-7">
              <Link href="/login">
                Open a Sandbox checkout
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[32px] bg-[radial-gradient(ellipse_at_50%_30%,rgba(34,211,238,0.18),transparent_65%)] blur-2xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/90 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400/10 text-cyan-200 ring-1 ring-inset ring-cyan-300/20">
                    <Code2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-semibold text-white">Checkout lifecycle</p>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200 ring-1 ring-inset ring-emerald-300/20">
                  Sandbox
                </span>
              </div>

              <ol className="relative px-5 py-5">
                <span
                  className="absolute bottom-8 left-[35px] top-8 w-px bg-gradient-to-b from-cyan-300/30 via-violet-400/25 to-transparent"
                  aria-hidden="true"
                />
                {flow.map((item, index) => (
                  <li key={item.label} className="relative flex gap-4 pb-6 last:pb-0">
                    <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-cyan-300/25 bg-ink-900 text-[10px] font-semibold text-cyan-200">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <code className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-slate-400 ring-1 ring-inset ring-white/[0.06]">
                          {item.status}
                        </code>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="border-t border-white/[0.07] bg-black/20 px-5 py-4">
                <pre className="overflow-x-auto font-mono text-[10px] leading-5 text-slate-400">
{`const order = await createOrder({
  invoiceId,        // trusted reference
  amount: invoice.amount,
  currency: invoice.currency
});
// approval returns to /payment-requests
// capture verifies amount before settling`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
