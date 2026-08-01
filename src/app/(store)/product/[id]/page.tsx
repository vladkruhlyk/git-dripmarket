import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProducts } from "@/sanity/queries";
import { formatPrice } from "@/lib/products";
import { ProductDetailClient } from "./ProductDetailClient";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

async function findProduct(id: string) {
  const products = await getProducts();
  return products.find(product => String(product.id) === id);
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await findProduct(decodeURIComponent(id));

  if (!product) {
    return { title: "Product not found" };
  }

  const title = `${product.brand} ${product.name}`;
  const description = product.description
    || `${product.brand} ${product.name} - ${formatPrice(product.salePrice || product.price)}. Authentic designer pieces at DRIP.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: product.image ? [{ url: product.image }] : undefined
    }
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const product = await findProduct(decodedId);

  if (!product) notFound();

  return <ProductDetailClient id={decodedId} />;
}
