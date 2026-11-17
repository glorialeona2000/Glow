import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bodoni-moda";
import "@fontsource-variable/jost";
import "./globals.css";

const siteUrl = process.env.SITE_URL || "https://belavica.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BELAVICA — Beauty Studio à Arlon",
    template: "%s · BELAVICA Beauty Studio",
  },
  description:
    "BELAVICA, beauty studio à Arlon : maquillage, mariée, cours d’auto-maquillage, lash & brow lift, manucure russe, construction en gel et soins du visage personnalisés. Réservation en ligne.",
  openGraph: {
    type: "website",
    locale: "fr_BE",
    siteName: "BELAVICA Beauty Studio",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0d0c0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
