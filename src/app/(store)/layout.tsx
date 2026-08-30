import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";
import { getProducts } from "@/sanity/queries";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const products = await getProducts();

  return (
    <>
      <AppProviders products={products}>
        <AppShell>{children}</AppShell>
      </AppProviders>
    </>
  );
}
