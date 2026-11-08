import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser, avatarUrl, displayName, authProvider } from "@/lib/auth/account";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageTransition } from "@/components/app-shell/page-transition";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const account = await requireUser();
  const user = account.user;

  return (
    <AppShell
      account={{
        name: displayName(user, account.profile),
        email: user?.email ?? "",
        avatarUrl: avatarUrl(user, account.profile),
        provider: authProvider(user, account.profile),
        currency: account.profile?.currency ?? "USD",
      }}
    >
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
