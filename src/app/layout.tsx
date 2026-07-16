import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FortGrow CRM",
    template: "%s · FortGrow CRM",
  },
  description:
    "CRM SaaS da FortGrow — gestão comercial, projetos, financeiro e resultados de marketing em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
