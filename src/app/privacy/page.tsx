import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How PayPilot AI handles account, ledger, and payment data in this Sandbox demonstration.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title="Privacy in plain language"
      updated="November 8, 2026"
    >
      <section>
        <h2 className="text-base font-semibold text-white">What this build is</h2>
        <p className="mt-2">
          PayPilot AI is a hackathon demonstration that runs entirely against the PayPal Sandbox.
          It does not process live money. This page explains what the application stores when you
          sign in and use the workspace.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">What we collect</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>Account details from your sign in provider: email, display name, avatar, and provider identifier.</li>
          <li>The invoices, payment requests, and transaction records you create in the workspace.</li>
          <li>Agent conversations, proposed actions, and the confirmations or declines you give.</li>
          <li>Operational audit records such as sign in events, record changes, and sensitive actions.</li>
          <li>Basic request metadata used for rate limiting and abuse prevention.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">How we use it</h2>
        <p className="mt-2">
          Account and ledger data power the dashboard, search, notifications, analytics, and the AI
          agent. Audit records help you review sensitive activity. Email addresses you provide for
          customers are used only to send reminders that you explicitly confirm.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Payments and PayPal</h2>
        <p className="mt-2">
          Checkout uses the PayPal Orders API in Sandbox mode. PayPilot never receives or stores card
          numbers. PayPal handles buyer approval inside its own interface. After a capture, the
          server compares the captured amount and currency with the stored record before the ledger
          settles.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">AI processing</h2>
        <p className="mt-2">
          When Gemini is configured, a compact snapshot of your ledger and your message are sent to
          the Gemini API to plan a response. When it is not configured, a deterministic local planner
          runs on the server. The AI never receives secrets, and it cannot execute an action by
          itself.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Storage and security</h2>
        <p className="mt-2">
          Records live in Supabase with row level security enabled, so queries are scoped to your
          account. The Supabase publishable key is intended for browser use under that policy. The
          service role key, PayPal secret, Gemini key, and Resend key are server only and are never
          sent to the browser.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Demo data</h2>
        <p className="mt-2">
          Demonstration records are flagged as demo data in the database. They are labeled in the
          interface and can be removed separately without touching real Sandbox captures.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Your choices</h2>
        <p className="mt-2">
          You can update your profile, change your base currency, adjust notification preferences,
          delete records, delete agent conversations, clear demo data, and sign out from the
          workspace. You can also delete your account records directly in Supabase if you control
          the project.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Contact</h2>
        <p className="mt-2">
          This is a demonstration project, not a commercial service. For questions about the
          implementation, open an issue in the repository that hosts this build.
        </p>
      </section>
    </LegalShell>
  );
}
