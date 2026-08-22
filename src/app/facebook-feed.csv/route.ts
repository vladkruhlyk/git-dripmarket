import { NextResponse } from "next/server";
import { getProducts } from "@/sanity/queries";
import type { Product } from "@/lib/products";

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dripmarketua.store";
const CURRENCY = "UAH";

const headers = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "sale_price",
  "link",
  "image_link",
  "brand",
  "google_product_category",
  "product_type",
  "custom_label_0",
  "custom_label_1",
  "custom_label_2",
  "custom_label_3",
  "custom_label_4"
];

function absoluteUrl(value: string): string {
  if (!value) return new URL("/hero.webp", SITE_URL).toString();
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return new URL(value, SITE_URL).toString();
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function productDescription(product: Product): string {
  const description = cleanText(product.description);
  if (description) return description;

  const stockLine = product.inStock
    ? `В наявності: ${product.sizes.join(", ")}.`
    : "Під замовлення: 12-16 днів.";

  return cleanText(`${product.brand} ${product.name}. ${stockLine}`);
}

function productRow(product: Product): string[] {
  const productUrl = absoluteUrl(`/product/${encodeURIComponent(product.id)}`);
  const availability = product.inStock ? "in stock" : "available for order";
  const hasSalePrice = Boolean(product.salePrice && product.salePrice > 0 && product.salePrice < product.price);
  const currentPrice = hasSalePrice ? Number(product.salePrice) : product.price;
  const sizes = product.sizes.length ? product.sizes.join(", ") : "-";

  return [
    product.id,
    `${product.brand} ${product.name}`,
    productDescription(product),
    availability,
    "new",
    `${product.price.toFixed(2)} ${CURRENCY}`,
    hasSalePrice ? `${product.salePrice?.toFixed(2)} ${CURRENCY}` : "",
    productUrl,
    absoluteUrl(product.image),
    product.brand,
    "Apparel & Accessories > Shoes",
    product.category,
    product.inStock ? "in_stock" : "preorder_12_16_days",
    product.brand,
    product.name,
    `${currentPrice.toFixed(2)} ${CURRENCY}`,
    sizes
  ];
}

export async function GET() {
  const products = await getProducts();
  const availableProducts = products.filter(product => product.price > 0 && product.image);
  const rows = [
    headers,
    ...availableProducts.map(productRow)
  ];

  const body = rows.map(row => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400"
    }
  });
}
