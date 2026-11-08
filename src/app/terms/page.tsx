import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for the PayPilot AI Sandbox demonstration.",
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Terms"
      title="Terms for this demonstration"
      updated="November 8, 2026"
    >
      <section>
        <h2 className="text-base font-semibold text-white">Acceptance</h2>
        <p className="mt-2">
          By using this build you agree to these terms. If you do not agree, do not sign in or use
          the workspace. The project is provided for demonstration and evaluation.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Sandbox only</h2>
        <p className="mt-2">
          All PayPal activity runs in Sandbox mode. No live funds are collected, transferred, or
          refunded. Live mode is blocked in this build. Do not use the application for real customer
          billing.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Your account</h2>
        <p className="mt-2">
          You are responsible for the account you sign in with and for the accuracy of the records
          you create. Keep access to your sign in provider secure. Sign out on shared devices.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">AI behavior</h2>
        <p className="mt-2">
          The agent prepares proposals and explanations. It can be wrong, incomplete, or slow. Every
          financial action requires your explicit confirmation, and the server may reject a request
          that fails validation. You remain responsible for the actions you confirm.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Acceptable use</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>Do not attempt to access records that belong to another account.</li>
          <li>Do not use the application to send unsolicited email or abusive content.</li>
          <li>Do not attempt to bypass authentication, rate limits, or Sandbox restrictions.</li>
          <li>Do not present this demonstration as a live financial service.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">No financial advice</h2>
        <p className="mt-2">
          Analytics, insights, and agent replies are informational. They are not accounting, tax,
          legal, or investment advice. Figures are computed from the records in your account and may
          be incomplete if records are missing.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Third party services</h2>
        <p className="mt-2">
          The application relies on Supabase, PayPal, Google Gemini, and Resend when those services
          are configured. Their terms and availability also apply. PayPal and related marks belong
          to PayPal. This project is not affiliated with or endorsed by PayPal.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Availability and changes</h2>
        <p className="mt-2">
          The project may change, break, or be taken offline without notice. Features that depend on
          missing credentials are documented as untested until those credentials are provided.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Limitation of liability</h2>
        <p className="mt-2">
          The application is provided as is, without warranties of any kind. To the extent permitted
          by law, the authors are not liable for losses arising from use of this demonstration.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Contact</h2>
        <p className="mt-2">
          For questions about these terms, open an issue in the repository that hosts this build.
        </p>
      </section>
    </LegalShell>
  );
}
