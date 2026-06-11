import "server-only";
import { sanityClient } from "@/sanity/client";
import { hasSanityConfig } from "@/sanity/env";
import type { Product } from "@/lib/products";

const productsQuery = `*[_type == "product"] | order(isNew desc, _createdAt desc) {
  "id": coalesce(externalId, slug.current, _id),
  "brand": brand->name,
  name,
  price,
  "salePrice": coalesce(salePrice, null),
  color,
  sizes,
  isNew,
  inStock,
  category,
  gender,
  description,
  "image": coalesce(images[0].asset->url, "/hero.webp"),
  "images": images[].asset->url
}`;

function normalizeProduct(product: Partial<Product>): Product {
  const image = product.image || "/hero.webp";

  return {
    id: String(product.id),
    brand: product.brand || "DRIP.",
    name: product.name || "Untitled product",
    price: Number(product.price) || 0,
    salePrice: product.salePrice ? Number(product.salePrice) : null,
    color: product.color || "black",
    sizes: Array.isArray(product.sizes) ? product.sizes.map(String) : [],
    isNew: Boolean(product.isNew),
    inStock: Boolean(product.inStock),
    category: product.category || "Other",
    gender: product.gender === "Men" || product.gender === "Women" ? product.gender : "Unisex",
    description: product.description || "",
    image,
    images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [image]
  };
}

export async function getProducts(): Promise<Product[]> {
  if (!hasSanityConfig) {
    console.warn("Sanity is not configured; using the WooCommerce migration fallback.");
    try {
      const { getCachedWooProducts } = await import("@/lib/woo-products");
      return await getCachedWooProducts();
    } catch (error) {
      console.error("WooCommerce migration fallback is unavailable:", error);
      return [];
    }
  }

  const products = await sanityClient.fetch<Partial<Product>[]>(productsQuery, {}, {
    next: { revalidate: 60, tags: ["products"] }
  });

  return products.map(normalizeProduct);
}
