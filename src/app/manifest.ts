import type { MetadataRoute } from "next";

/** Manifest PWA — atalho na tela inicial com a identidade oficial da FortGrow. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FortGrow",
    short_name: "FortGrow",
    description: "CRM da FortGrow — gestão comercial, projetos, financeiro e resultados de marketing.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090d",
    theme_color: "#0b0e14",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
