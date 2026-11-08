"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { GithubIcon } from "@/components/ui/brand-icons";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Logo } from "@/components/ui/brand";
import { Spinner } from "@/components/ui/feedback";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.26-1.7 3.7-5.5 3.7-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.5l2.63-2.53C16.86 2.98 14.65 2 12 2 6.99 2 2.93 6.06 2.93 11.07 2.93 16.08 6.99 20.14 12 20.14c5.24 0 8.72-3.68 8.72-8.87 0-.6-.06-1.05-.14-1.5H12Z"
      />
    </svg>
  );
}

const errorCopy: Record<string, string> = {
  supabase_not_configured:
    "Supabase is not configured yet. Add the project URL and publishable key to .env.local.",
  provider_sign_in_failed:
    "The provider did not finish the sign in. Check that Google or GitHub OAuth is enabled in Supabase.",
  missing_code: "The sign in response was incomplete. Please try again.",
  auth_callback_failed: "We could not verify that sign in. Please try again.",
  session_not_established: "The session was not created. Please try again.",
};

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? errorCopy[initialError] ?? "Sign in failed. Please try again." : null
  );
  const [notice, setNotice] = useState<string | null>(null);

  async function startOauth(provider: "google" | "github") {
    setError(null);
    setNotice(null);
    setOauthLoading(provider);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (oauthError) {
        setError(
          oauthError.message.toLowerCase().includes("not enabled")
            ? `${provider === "google" ? "Google" : "GitHub"} OAuth is not enabled for this Supabase project yet.`
            : oauthError.message
        );
        setOauthLoading(null);
      }
    } catch {
      setError("Single sign on is unavailable right now. You can still use email and password.");
      setOauthLoading(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!configured) {
      setError(errorCopy.supabase_not_configured);
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least eight characters for your password.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.session) {
          router.replace(next);
          router.refresh();
          return;
        }
        setNotice("Check your inbox to confirm the new account, then return here to sign in.");
        setMode("signin");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        const message = signInError.message.toLowerCase();
        setError(
          message.includes("invalid login")
            ? "That email and password did not match. Try again or create an account."
            : message.includes("email not confirmed")
              ? "Confirm your email address before signing in. Check your inbox for the link."
              : signInError.message
        );
        return;
      }

      try {
        await fetch("/api/email/login-notification", { method: "POST" });
      } catch {
        // A security email must never block a successful sign in.
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("We could not reach the authentication service. Check your connection and try again.");
    } finally {
      setSubmitting(false);
      setOauthLoading(null);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="lg:hidden">
        <Logo />
      </div>

      <div className="mt-8 lg:mt-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
          Welcome to PayPilot
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          {mode === "signin" ? "Sign in to your workspace" : "Create your workspace"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {mode === "signin"
            ? "Pick up where you left off. Your ledger, your agent, and every pending decision are waiting."
            : "Start with a clean ledger. Load demonstration records whenever you want a guided tour."}
        </p>
      </div>

      {!configured ? (
        <div className="mt-6 flex gap-3 rounded-xl border border-amber-300/20 bg-amber-400/[0.06] px-4 py-3 text-sm leading-6 text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Supabase is not configured in this environment. Add the project URL and publishable key
            to <code className="font-mono text-xs">.env.local</code>, then restart the server.
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-6 flex gap-3 rounded-xl border border-rose-300/20 bg-rose-400/[0.07] px-4 py-3 text-sm leading-6 text-rose-100"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="mt-6 flex gap-3 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.06] px-4 py-3 text-sm leading-6 text-emerald-100"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{notice}</p>
        </div>
      ) : null}

      <div className="mt-7 grid grid-cols-2 gap-2.5">
        <Button
          type="button"
          variant="secondary"
          onClick={() => startOauth("google")}
          disabled={Boolean(oauthLoading) || submitting || !configured}
        >
          {oauthLoading === "google" ? <Spinner /> : <GoogleIcon />}
          Google
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => startOauth("github")}
          disabled={Boolean(oauthLoading) || submitting || !configured}
        >
          {oauthLoading === "github" ? <Spinner /> : <GithubIcon />}
          GitHub
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email address" htmlFor="email" required>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="pl-10"
              required
            />
          </div>
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          hint={mode === "signup" ? "At least eight characters." : undefined}
          required
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="focus-ring absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Button type="submit" size="md" className="w-full" loading={submitting} disabled={!configured}>
          {mode === "signin" ? "Sign in" : "Create account"}
          {!submitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-400">
        {mode === "signin" ? "New to PayPilot?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="focus-ring rounded font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
        >
          {mode === "signin" ? "Create an account" : "Sign in instead"}
        </button>
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
        <Link href="/demo" className="focus-ring rounded underline-offset-4 hover:text-slate-300 hover:underline">
          Explore the demo without an account
        </Link>
      </div>

      <p className="mt-8 text-center text-[11px] leading-5 text-slate-500">
        By continuing you agree to the{" "}
        <Link href="/terms" className="underline-offset-4 hover:text-slate-300 hover:underline">
          terms
        </Link>{" "}
        and acknowledge the{" "}
        <Link href="/privacy" className="underline-offset-4 hover:text-slate-300 hover:underline">
          privacy notes
        </Link>
        . PayPilot runs on PayPal Sandbox. No live funds move.
      </p>
    </div>
  );
}
