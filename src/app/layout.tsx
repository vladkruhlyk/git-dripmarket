import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { MetaPixel } from "@/components/MetaPixel";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dripmarketua.store";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DRIP. - Luxury Sneakers & Footwear",
    template: "%s | DRIP."
  },
  description: "Shop authentic luxury sneakers, heels, bags and accessories from top designers."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
