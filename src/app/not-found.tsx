import Link from "next/link";
import { ArrowLeft, Compass, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-ink-950 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg text-center">
        <Logo className="mx-auto" />
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">
          Error 404
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
          This page took a different route
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The address does not match a page in PayPilot. Your ledger and conversations are untouched.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/demo">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Guided demo
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/ai-agent">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Agent
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
