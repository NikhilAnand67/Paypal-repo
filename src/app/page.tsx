import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { AgentDemo } from "@/components/landing/agent-demo";
import { Features, HowItWorks } from "@/components/landing/features";
import { PaypalSection } from "@/components/landing/paypal-section";
import { SecuritySection } from "@/components/landing/security-section";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "PayPilot AI — Think smarter. Pay faster. Stay in control.",
  description:
    "An AI financial agent that prepares invoices and payment requests, explains your cash flow, and waits for your approval before any PayPal Sandbox order is created.",
  alternates: { canonical: "/" },
};

const stack = ["PayPal Orders v2", "Supabase", "Google Gemini", "Resend", "Vercel"];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PayPilot AI",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "An AI financial agent for invoices, payment requests, cash flow insight, and approval-gated PayPal Sandbox payments.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: "Nikhil Anand" },
  featureList: [
    "AI-prepared invoices and payment requests",
    "Explicit confirmation before financial actions",
    "PayPal Sandbox orders",
    "Cash flow analytics from stored records",
  ],
};

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingNav />
      <main id="main">
        <Hero />

        <div className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="section-shell flex flex-col items-center justify-between gap-4 py-5 sm:flex-row">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Built with production grade pieces
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {stack.map((item) => (
                <li key={item} className="text-xs font-medium text-slate-400">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <AgentDemo />
        <Features />
        <HowItWorks />
        <PaypalSection />
        <SecuritySection />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
