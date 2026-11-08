import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PayPilot AI",
    short_name: "PayPilot",
    description:
      "An AI financial agent that prepares invoices and payment requests and waits for your confirmation.",
    start_url: "/",
    display: "standalone",
    background_color: "#06060b",
    theme_color: "#06060b",
    categories: ["finance", "business", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
