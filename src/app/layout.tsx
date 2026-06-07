import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, siteConfig } from "@/lib/site";

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
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteConfig.name,
            url: siteConfig.url,
            description: siteConfig.description,
            logo: absoluteUrl("/deepflow-logo-512.png"),
          }}
        />
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
      {googleAnalyticsId ? <GoogleAnalytics gaId={googleAnalyticsId} /> : null}
    </html>
  );
}
