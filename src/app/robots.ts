import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site-config";

/**
 * O site institucional é público; o sistema não.
 *
 * `/admin` e `/portal` já exigem login, mas mantê-los fora do índice evita
 * que a tela de login apareça em busca pelo nome da FortGrow — e que o
 * Google gaste rastreamento em página que ele nunca vai conseguir abrir.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/portal", "/api", "/login"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
