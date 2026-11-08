import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/account";
import { getLedger } from "@/lib/data/workspace";
import { PageHeader } from "@/components/dashboard/page-header";
import { InvoicesView } from "@/components/invoices/invoices-view";
import { Button } from "@/components/ui/button";
import type { Currency } from "@/types/database";

export const metadata: Metadata = {
  title: "Payment requests",
  description: "Create payment requests and collect them through PayPal Sandbox.",
};

export default async function PaymentRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; highlight?: string }>;
}) {
  const account = await requireUser();
  const user = account.user!;
  const params = await searchParams;
  const ledger = await getLedger(account.supabase, user.id, { invoices: 500, transactions: 1 });

  const requests = ledger.invoices.filter((invoice) => invoice.kind === "payment_request");

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Payment requests"
        title="Ask for money without the guesswork"
        description="A request is an isolated PayPal Sandbox order with the amount fixed on the server. No capture happens until the buyer approves inside PayPal."
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href="/ai-agent?prompt=Create%20a%20%24250%20payment%20request%20for%20my%20website%20development%20client%2C%20due%20in%20seven%20days.">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Ask the agent
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/payment-requests?new=1">
                <HandCoins className="h-3.5 w-3.5" aria-hidden="true" />
                New request
              </Link>
            </Button>
          </>
        }
      />

      <InvoicesView
        kind="payment_request"
        invoices={requests}
        defaultCurrency={(account.profile?.currency ?? "USD") as Currency}
        paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? null}
        initialNew={params.new === "1"}
        highlight={params.highlight}
        databaseError={ledger.error}
      />
    </div>
  );
}
