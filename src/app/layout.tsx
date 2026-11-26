import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { BROKER_INFO } from "@/lib/format";
import { getSiteUrl } from "@/lib/seo";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BROKER_INFO.brandName} | Imóveis em Cotia e Granja Vianna`,
    template: `%s | ${BROKER_INFO.brandName}`,
  },
  description: `Casas, apartamentos e terrenos em condomínios de Cotia e Granja Vianna (SP). Atendimento direto com ${BROKER_INFO.brokerName} — CRECI ${BROKER_INFO.creci}.`,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: BROKER_INFO.brandName,
    title: `${BROKER_INFO.brandName} | Imóveis em Cotia e Granja Vianna`,
    description: `Imóveis selecionados em Cotia e Granja Vianna com atendimento personalizado. CRECI ${BROKER_INFO.creci}.`,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BROKER_INFO.brandName} | Imóveis em Cotia e Granja Vianna`,
    description: `Imóveis selecionados em Cotia e Granja Vianna com atendimento personalizado. CRECI ${BROKER_INFO.creci}.`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${lora.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
