import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config/status";

const base = appUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/demo", "/login", "/privacy", "/terms"],
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/ai-agent",
          "/transactions",
          "/invoices",
          "/payment-requests",
          "/analytics",
          "/notifications",
          "/settings",
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", base).toString(),
    host: base,
  };
}
