import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { PROGRAMS, DOCTORS } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/programs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/doctors`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const programRoutes: MetadataRoute.Sitemap = PROGRAMS.map((p) => ({
    url: `${SITE_URL}/programs/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const doctorRoutes: MetadataRoute.Sitemap = DOCTORS.map((d) => ({
    url: `${SITE_URL}/doctors/${d.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...programRoutes, ...doctorRoutes];
}
