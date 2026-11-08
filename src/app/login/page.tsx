import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { MoneyRain } from "@/components/three/money-rain";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui/brand";
import { sanitizeNextPath } from "@/lib/auth/account";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with Google, GitHub, or email to open your PayPilot workspace.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgba(139,92,246,0.16),transparent_48%),radial-gradient(ellipse_at_90%_80%,rgba(34,211,238,0.08),transparent_45%)]"
        aria-hidden="true"
      />

      <div className="relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden overflow-hidden border-r border-white/[0.07] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <MoneyRain variant="auth" density={18} />
          <div className="relative z-10">
            <Logo />
          </div>

          <div className="relative z-10 max-w-xl py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-violet-200" aria-hidden="true" />
              Prepared by AI, approved by you
            </div>
            <h2 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-white xl:text-5xl">
              Your money.
              <br />
              Your AI.
              <br />
              <span className="text-gradient-violet">Your control.</span>
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-400">
              Ask for the invoice, the request, or the insight. PayPilot prepares the next action and
              waits for your confirmation before anything financial runs.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Every amount is validated on the server",
                "PayPal Sandbox orders, never live funds",
                "Your ledger stays private with row level security",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Sandbox build
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              No card data stored
            </span>
            <Link href="/privacy" className="focus-ring rounded underline-offset-4 hover:text-slate-300 hover:underline">
              Privacy
            </Link>
          </div>
        </aside>

        <main id="main" className="relative flex min-h-dvh items-center justify-center px-6 py-14 sm:px-10">
          <div className="w-full max-w-md">
            <LoginForm next={next} initialError={error} />
            <p className="mt-8 text-center text-xs text-slate-600 lg:hidden">
              <Link href="/" className="focus-ring rounded underline-offset-4 hover:text-slate-400 hover:underline">
                Back to PayPilot
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
