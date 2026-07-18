import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FortGrow",
    template: "%s · FortGrow",
  },
  description:
    "CRM SaaS da FortGrow — gestão comercial, projetos, financeiro e resultados de marketing em um só lugar.",
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
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
