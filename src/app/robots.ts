import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/siteConfig";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Gated/utility pages with no unique public content to index -- an
      // anonymous crawler hitting these just gets redirected to /login.
      disallow: ["/login", "/submit", "/route/*/edit", "/route/*/gpx", "/auth/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
