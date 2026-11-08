import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/ui/brand-icons";
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
    <footer className="border-t border-white/[0.07] bg-ink-950">
      <div className="section-shell py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
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
              <div key={column.title}>
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
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-slate-500">
            © {year} PayPilot AI. Built for the Build What&apos;s Next with PayPal and AI hackathon.
            PayPal, the PayPal logo, and related marks are trademarks of PayPal. This project is not
            affiliated with or endorsed by PayPal. Sandbox only, no live payment processing.
          </p>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer noopener"
              className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
              aria-label="GitHub"
            >
              <GithubIcon />
            </a>
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noreferrer noopener"
              className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
              aria-label="LinkedIn"
            >
              <LinkedinIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
