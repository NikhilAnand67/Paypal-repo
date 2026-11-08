import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/account";
import { getLedger } from "@/lib/data/workspace";
import { PageHeader } from "@/components/dashboard/page-header";
import { TransactionsView } from "@/components/transactions/transactions-view";
import type { Currency } from "@/types/database";

export const metadata: Metadata = {
  title: "Transactions",
  description: "Every verified PayPal Sandbox capture, read from your own ledger.",
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const account = await requireUser();
  const user = account.user!;
  const params = await searchParams;
  const ledger = await getLedger(account.supabase, user.id, { invoices: 500, transactions: 500 });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Transactions"
        title="Proof of what actually moved"
        description="Only verified PayPal Sandbox captures and their real statuses appear here. PayPilot never invents a transaction or a success response."
      />

      <TransactionsView
        transactions={ledger.transactions}
        invoices={ledger.invoices}
        baseCurrency={(account.profile?.currency ?? "USD") as Currency}
        highlight={params.highlight}
        databaseError={ledger.error}
      />
    </div>
  );
}
