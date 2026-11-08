import {
  Database,
  EyeOff,
  Fingerprint,
  KeyRound,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: Database,
    title: "Row level security",
    copy: "Every user owned table enforces row level access in Postgres, with policies tied to the authenticated user.",
  },
  {
    icon: Fingerprint,
    title: "Verified sessions",
    copy: "Server routes resolve the session from secure cookies. A user id is never accepted from the browser.",
  },
  {
    icon: KeyRound,
    title: "Secrets stay server side",
    copy: "The PayPal secret, Gemini key, Resend key, and service role key never reach the client bundle.",
  },
  {
    icon: ScrollText,
    title: "Audit trail",
    copy: "Financial actions, confirmations, declined proposals, and account security events are recorded for review.",
  },
];

const never = [
  "Execute a financial action without an explicit confirmation",
  "Trust an amount that was sent by the browser",
  "Ask for or store your PayPal password or card number",
  "Mix demonstration records into real Sandbox captures",
  "Show an AI generated payment as completed before PayPal confirms it",
];

export function SecuritySection() {
  return (
    <section id="security" className="relative py-20 sm:py-24">
      <div className="section-shell">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <Badge tone="emerald">Security model</Badge>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              The AI is useful. The boundary is strict.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-400">
              PayPilot treats the model as a planner, not an authority. The model can read your
              records and propose an action. Only a verified person can approve it, and only the
              server can execute it.
            </p>

            <div className="mt-8 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                <p className="text-sm font-semibold text-white">What PayPilot will never do</p>
              </div>
              <ul className="mt-4 space-y-2.5">
                {never.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-6 text-slate-400">
                    <EyeOff className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-300/80" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Button asChild variant="outline" className="mt-7">
              <Link href="/privacy">Read the privacy notes</Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors duration-300 hover:border-white/[0.14] hover:bg-white/[0.04]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] text-emerald-200">
                  <pillar.icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-sm font-semibold text-white">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{pillar.copy}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-white/[0.07] bg-[linear-gradient(150deg,rgba(139,92,246,0.1),rgba(34,211,238,0.04))] p-5 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Confirmation, in practice
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { step: "Propose", detail: "The agent writes a pending action." },
                  { step: "Confirm", detail: "You approve with the exact details shown." },
                  { step: "Execute", detail: "The server revalidates and runs it once." },
                ].map((item) => (
                  <div key={item.step} className="rounded-xl border border-white/[0.07] bg-black/20 p-3.5">
                    <p className="text-xs font-semibold text-white">{item.step}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
