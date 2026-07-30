import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GlassPointer } from "@/components/ui/glass-pointer";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  // Base de toda URL absoluta: sem isso o Next usa o host da requisição, e o
  // endereço do Render apareceria nas prévias de compartilhamento
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.titulo,
    template: "%s · FortGrow",
  },
  description: SITE.descricao,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE.url,
    siteName: "FortGrow",
    title: SITE.titulo,
    description: SITE.descricao,
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "FortGrow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.titulo,
    description: SITE.descricao,
    images: ["/icon.png"],
  },
  // O site é para ser achado; as áreas logadas ficam fora (ver robots.ts)
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FortGrow",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen font-sans">
        {children}
        {/* iluminação do vidro — um listener para toda a árvore */}
        <GlassPointer />
      </body>
    </html>
  );
}
