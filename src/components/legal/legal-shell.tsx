import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/brand";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LegalShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-ink-950">
      <header className="border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl">
        <div className="section-shell flex h-16 items-center gap-3">
          <Logo />
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/demo"
              className="focus-ring rounded text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              Guided demo
            </Link>
            <Link
              href="/login"
              className="focus-ring rounded text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="section-shell py-12 sm:py-16">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-1.5 rounded text-xs font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to the product
        </Link>

        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-xs text-slate-500">Last updated {updated}</p>

        <div className="mt-10 max-w-3xl space-y-8 text-sm leading-7 text-slate-400">
          {children}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
