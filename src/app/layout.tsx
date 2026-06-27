import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FloatingMiniPlayer } from "@/components/product/floating-mini-player";
import { JsonLd } from "@/components/seo/json-ld";
import { AuthProvider } from "@/features/auth/auth-provider";
import { CloudSyncProvider } from "@/features/sync/cloud-sync-provider";
import { siteConfig } from "@/lib/site";
import { createGlobalStructuredData } from "@/lib/structured-data";

import "@/styles/globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_ID?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: "%s | DeepFlow",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  category: "productivity",
  manifest: "/manifest.json",
  verification: {
    google: "Vr7joc_qZNnluirVnu2R1nwGiN5iMsmvTDupNmu5YwE",
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    images: [
      {
        url: siteConfig.socialImage,
        width: 1200,
        height: 630,
        alt: siteConfig.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.socialImage],
  },
  icons: {
    icon: [
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/favicon-32x32.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f6f3ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${instrumentSerif.variable}`}>
        <AuthProvider>
          <CloudSyncProvider>
            <JsonLd data={createGlobalStructuredData()} />
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <SiteHeader />
            <main id="main-content">{children}</main>
            <FloatingMiniPlayer />
            <SiteFooter />
          </CloudSyncProvider>
        </AuthProvider>
      </body>
      {googleAnalyticsId ? <GoogleAnalytics gaId={googleAnalyticsId} /> : null}
    </html>
  );
}
