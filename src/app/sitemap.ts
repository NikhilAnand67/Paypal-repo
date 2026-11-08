import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config/status";

const base = appUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: new URL("/", base).toString(), lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: new URL("/demo", base).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: new URL("/login", base).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: new URL("/privacy", base).toString(),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: new URL("/terms", base).toString(),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
