import { Suspense } from "react";
import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";
import { MetaPixel } from "@/components/MetaPixel";
import { getProducts } from "@/sanity/queries";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const products = await getProducts();

  return (
    <>
      <Suspense fallback={null}>
        <MetaPixel />
      </Suspense>
      <AppProviders products={products}>
        <AppShell>{children}</AppShell>
      </AppProviders>
    </>
  );
}
