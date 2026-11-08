"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const MoneyRainCanvas = dynamic(
  () => import("./money-rain-canvas").then((module) => module.MoneyRainCanvas),
  { ssr: false }
);

function CssBills({ variant }: { variant: "hero" | "auth" | "app" }) {
  const bills =
    variant === "app"
      ? [
          { left: "8%", top: "12%", delay: "0s", rotate: "-14deg", scale: 0.9 },
          { left: "72%", top: "24%", delay: "2.2s", rotate: "12deg", scale: 1.1 },
          { left: "42%", top: "62%", delay: "4s", rotate: "-6deg", scale: 0.75 },
        ]
      : [
          { left: "6%", top: "10%", delay: "0s", rotate: "-16deg", scale: 1.15 },
          { left: "83%", top: "8%", delay: "1.4s", rotate: "18deg", scale: 0.95 },
          { left: "68%", top: "54%", delay: "3.1s", rotate: "-10deg", scale: 1.3 },
          { left: "18%", top: "66%", delay: "4.6s", rotate: "22deg", scale: 0.8 },
          { left: "48%", top: "26%", delay: "5.8s", rotate: "-4deg", scale: 0.65 },
        ];

  return (
    <div className="absolute inset-0">
      {bills.map((bill, index) => (
        <span
          key={index}
          className="absolute h-16 w-36 rounded-md border border-emerald-900/40 bg-gradient-to-br from-[#d9efd2] via-[#c3e4b8] to-[#aed8a4] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] motion-safe:animate-float-slow"
          style={{
            left: bill.left,
            top: bill.top,
            transform: `rotate(${bill.rotate}) scale(${bill.scale})`,
            animationDelay: bill.delay,
          }}
          aria-hidden="true"
        >
          <span className="absolute inset-1 rounded-sm border border-emerald-900/30" />
          <span className="absolute inset-0 grid place-items-center font-mono text-lg font-bold text-emerald-900/80">
            $
          </span>
        </span>
      ))}
    </div>
  );
}

class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // A failed WebGL scene must never take down the page.
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function MoneyRain({
  variant = "hero",
  density = 22,
  className,
}: {
  variant?: "hero" | "auth" | "app";
  density?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motionQuery.matches);
    update();
    motionQuery.addEventListener("change", update);

    return () => motionQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: "160px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const showCanvas = inView && !reduced;
  const fallback = <CssBills variant={variant} />;

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        variant === "hero" && "opacity-50",
        variant === "auth" && "opacity-55",
        variant === "app" && "opacity-[0.18]",
        className
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_-10%,rgba(139,92,246,0.22),transparent_55%),radial-gradient(ellipse_at_84%_8%,rgba(34,211,238,0.14),transparent_48%),radial-gradient(ellipse_at_55%_100%,rgba(217,70,239,0.12),transparent_52%)]" />
      {showCanvas ? (
        <SceneErrorBoundary fallback={fallback}>
          <MoneyRainCanvas density={density} />
        </SceneErrorBoundary>
      ) : (
        fallback
      )}
      {variant === "hero" ? (
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#06060b] to-transparent" />
      ) : null}
      {variant !== "app" ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,6,11,0.62)_0%,rgba(6,6,11,0.32)_42%,transparent_70%)]" />
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(6,6,11,0.72)_100%)]" />
    </div>
  );
}
