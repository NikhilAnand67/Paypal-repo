import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/account";
import { getWorkspace } from "@/lib/data/workspace";
import { PageHeader } from "@/components/dashboard/page-header";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { Button } from "@/components/ui/button";
import type { Currency } from "@/types/database";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Collected totals, outstanding balances, and payment trends from your ledger.",
};

export default async function AnalyticsPage() {
  const account = await requireUser();
  const user = account.user!;
  const currency = (account.profile?.currency ?? "USD") as Currency;
  const workspace = await getWorkspace(account.supabase, user.id, currency);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Analytics"
        title="Numbers from your own ledger"
        description="No estimates, no invented exchange rates, no fabricated history. Every figure here is computed from stored records in your base currency."
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href="/transactions">
                <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                Transactions
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/ai-agent?prompt=Analyze%20my%20payment%20trends">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Ask the agent
              </Link>
            </Button>
          </>
        }
      />

      <AnalyticsView
        summary={workspace.summary}
        insights={workspace.insights}
        databaseError={workspace.error}
      />
    </div>
  );
}
