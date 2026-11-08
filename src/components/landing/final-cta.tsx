import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaglineReveal } from "./tagline-reveal";

export function FinalCta() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="section-shell">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-ink-925 px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0 grid-lines opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_72%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.22),transparent_55%),radial-gradient(ellipse_at_80%_100%,rgba(34,211,238,0.12),transparent_45%)]"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-violet-200" aria-hidden="true" />
              The next step is still yours
            </div>

            <TaglineReveal
              text="Think smarter. Pay faster. Stay in control."
              className="mx-auto mt-7 max-w-3xl text-gradient"
            />

            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
              Bring your invoices, your requests, and your questions. PayPilot handles the
              preparation and leaves the decision where it belongs.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/login">
                  Get started
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                <Link href="/demo">Walk through the demo</Link>
              </Button>
            </div>

            <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              PayPal Sandbox only. No live funds move in this build.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
