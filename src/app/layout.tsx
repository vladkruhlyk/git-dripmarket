import type { Metadata } from "next";
import { Suspense } from "react";
import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";
import { MetaPixel } from "@/components/MetaPixel";
import "./globals.css";

export const metadata: Metadata = {
  title: "DRIP. - Luxury Sneakers & Footwear",
  description: "Shop authentic luxury sneakers, heels, bags and accessories from top designers."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
