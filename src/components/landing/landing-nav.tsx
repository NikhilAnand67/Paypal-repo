"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "#product", label: "Product" },
  { href: "#agent", label: "AI agent" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled ? "border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <nav className="section-shell flex h-20 items-center justify-between gap-6" aria-label="Main">
        <Logo />

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="focus-ring rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open ? (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-x-0 top-20 bottom-0 z-40 overflow-y-auto border-t border-white/[0.07] bg-ink-950/97 px-6 pb-10 pt-6 backdrop-blur-2xl md:hidden"
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-slate-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link href="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/login" onClick={() => setOpen(false)}>
                Get started
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-xs leading-5 text-slate-500">
            PayPal Sandbox only. No live money moves in this demonstration.
          </p>
        </div>
      ) : null}
    </header>
  );
}
