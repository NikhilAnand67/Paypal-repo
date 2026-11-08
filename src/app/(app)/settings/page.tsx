import type { Metadata } from "next";
import { requireUser, authProvider } from "@/lib/auth/account";
import { getSecurityActivity } from "@/lib/data/workspace";
import { getIntegrationStatus } from "@/lib/config/status";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = {
  title: "Settings",
  description: "Profile, currency, notifications, security activity, and integrations.",
};

export default async function SettingsPage() {
  const account = await requireUser();
  const user = account.user!;
  const activity = await getSecurityActivity(account.supabase, user.id, 12);
  const status = getIntegrationStatus();

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Settings"
        title="Your account, your controls"
        description="Update how PayPilot addresses you, which emails you receive, and review the audit trail for sensitive activity."
      />

      <SettingsForm
        profile={account.profile}
        email={user.email ?? ""}
        provider={authProvider(user, account.profile)}
        status={status}
        activity={activity.logs}
        activityError={activity.error}
      />
    </div>
  );
}
