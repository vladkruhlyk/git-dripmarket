import type { Metadata } from "next";
import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "DRIP. - Luxury Sneakers & Footwear",
  description: "Shop authentic luxury sneakers, heels, bags and accessories from top designers."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
