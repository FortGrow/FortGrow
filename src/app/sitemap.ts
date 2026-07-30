import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site-config";

/** Só a home é pública — o resto do sistema fica atrás de login. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
