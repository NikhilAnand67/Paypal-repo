import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppToaster } from "@/components/ui/app-toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "PayPilot AI — Think smarter. Pay faster. Stay in control.",
    template: "%s · PayPilot AI",
  },
  description:
    "An AI financial agent for freelancers, creators, students, and small businesses. Prepare payment requests, understand cash flow, and collect with PayPal Sandbox after you confirm.",
  keywords: [
    "AI payments",
    "PayPal",
    "financial agent",
    "invoices",
    "payment requests",
    "freelancers",
    "cash flow",
  ],
  authors: [{ name: "PayPilot AI" }],
  creator: "PayPilot AI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "PayPilot AI",
    title: "PayPilot AI — Your money. Your AI. Your control.",
    description:
      "Ask in plain language. Review the action. Approve the payment. PayPilot combines a grounded AI agent with PayPal Sandbox orders.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayPilot AI — Think smarter. Pay faster. Stay in control.",
    description:
      "An AI financial agent that prepares payments and asks for confirmation before anything runs.",
  },
  robots: { index: true, follow: true },
  applicationName: "PayPilot AI",
  category: "finance",
};

export const viewport: Viewport = {
  themeColor: "#06060b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-dvh flex-col bg-ink-950 font-sans text-slate-100 antialiased">
        <a
          href="#main"
          className="sr-only z-[100] rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
