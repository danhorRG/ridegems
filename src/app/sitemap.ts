import type { MetadataRoute } from "next";
import { getRoutes } from "@/lib/routes";
import { siteConfig } from "@/lib/siteConfig";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await getRoutes();

  const routeEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${siteConfig.url}/route/${route.id}`,
    lastModified: route.createdAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...routeEntries,
  ];
}
