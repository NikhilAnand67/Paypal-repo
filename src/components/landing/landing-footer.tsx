import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ProfileLinks } from "@/components/site/profile-links";
import { siteProfile } from "@/lib/site/profile";
import { Logo } from "@/components/ui/brand";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/ai-agent", label: "AI agent" },
      { href: "/invoices", label: "Invoices" },
      { href: "/payment-requests", label: "Payment requests" },
      { href: "/analytics", label: "Analytics" },
    ],
  },
  {
    title: "Experience",
    links: [
      { href: "/demo", label: "Guided demo" },
      { href: "/dashboard", label: "Workspace" },
      { href: "/settings", label: "Settings" },
      { href: "/notifications", label: "Notifications" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/login", label: "Sign in" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
];

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-ink-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-44 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="section-shell relative py-14">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              A financial operations assistant for freelancers, creators, students, and small
              businesses. Prepared by AI, approved by you.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/[0.06] px-3 py-1.5 text-xs font-medium text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Sandbox build
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="focus-ring rounded text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Designed and built by
            </p>
            <p className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-white">
              {siteProfile.name}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{siteProfile.role}</p>
          </div>
          <div className="flex flex-col gap-2.5 sm:items-end">
            <ProfileLinks variant="inline" />
            <p className="text-[11px] text-slate-500">
              Open to collaborations, product work, and new ideas.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-slate-500">
            © {year} PayPilot AI. Built for the Build What&apos;s Next with PayPal and AI hackathon.
            PayPal, the PayPal logo, and related marks are trademarks of PayPal. This project is not
            affiliated with or endorsed by PayPal. Sandbox only, no live payment processing.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <Link
              href="/privacy"
              className="focus-ring rounded transition-colors hover:text-slate-300"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="focus-ring rounded transition-colors hover:text-slate-300"
            >
              Terms
            </Link>
            <Link
              href="/login"
              className="focus-ring rounded transition-colors hover:text-slate-300"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
