import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/account";
import { getLedger } from "@/lib/data/workspace";
import { PageHeader } from "@/components/dashboard/page-header";
import { InvoicesView } from "@/components/invoices/invoices-view";
import { Button } from "@/components/ui/button";
import type { Currency } from "@/types/database";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Draft, send, and settle invoices from your own ledger.",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; highlight?: string }>;
}) {
  const account = await requireUser();
  const user = account.user!;
  const params = await searchParams;
  const ledger = await getLedger(account.supabase, user.id, { invoices: 500, transactions: 1 });

  const invoices = ledger.invoices.filter((invoice) => invoice.kind === "invoice");

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Invoices"
        title="Billing you can see end to end"
        description="Every invoice here is a stored record. Amounts are never generated on the fly, and PayPal captures are checked against the record before it settles."
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href="/ai-agent?prompt=Create%20an%20invoice%20for%20my%20next%20client%20project.">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Ask the agent
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/invoices?new=1">
                <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
                New invoice
              </Link>
            </Button>
          </>
        }
      />

      <InvoicesView
        kind="invoice"
        invoices={invoices}
        defaultCurrency={(account.profile?.currency ?? "USD") as Currency}
        paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? null}
        initialNew={params.new === "1"}
        highlight={params.highlight}
        databaseError={ledger.error}
      />
    </div>
  );
}
