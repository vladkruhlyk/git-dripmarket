import "server-only";
import { unstable_cache } from "next/cache";
import type { Product } from "@/lib/products";

type WooProduct = {
  id: number;
  name: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  price_html?: string;
  on_sale?: boolean;
  stock_status?: "instock" | "outofstock" | "onbackorder";
  short_description?: string;
  description?: string;
  images?: { src: string }[];
  categories?: { name: string; slug?: string }[];
  tags?: { name: string }[];
  brands?: { name: string }[];
  attributes?: { name: string; options: string[] }[];
};

const WC_URL = process.env.WC_URL || "https://cms.dripmarketua.store";
const IMAGE_PROXY_HOSTS = new Set(["cms.dripmarketua.store"]);
const GENDER_CATEGORY_SLUGS = new Set(["menswear", "womenswear", "unisex"]);

function getWooCredentials() {
  const key = process.env.WC_KEY || process.env.WC_WRITE_KEY;
  const secret = process.env.WC_SECRET || process.env.WC_WRITE_SECRET;

  if (!key || !secret) {
    throw new Error("Missing WooCommerce environment variables");
  }

  return { key, secret };
}

function parsePrice(value?: string): number {
  if (!value) return 0;
  return Number.parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}

function stripHtml(value?: string): string {
  return decodeHtmlEntities((value || "").replace(/<[^>]*>/g, "")).trim();
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\""
  };

  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, code: string) => {
    const normalized = code.toLowerCase();
    if (normalized[0] === "#") {
      const radix = normalized.startsWith("#x") ? 16 : 10;
      const numericValue = Number.parseInt(normalized.replace(/^#x?/, ""), radix);
      return Number.isFinite(numericValue) ? String.fromCodePoint(numericValue) : entity;
    }
    return namedEntities[normalized] || entity;
  });
}

function parsePriceHtml(priceHtml?: string, fallbackPrice?: string, salePrice?: string, onSale?: boolean) {
  if (!priceHtml) {
    return {
      price: parsePrice(fallbackPrice),
      salePrice: onSale && salePrice ? parsePrice(salePrice) : null
    };
  }

  const amounts = [...priceHtml.matchAll(/<bdi[^>]*>.*?<\/bdi>/g)]
    .map(match => stripHtml(match[0]))
    .map(parsePrice)
    .filter(Boolean);

  if (amounts.length >= 2) {
    return { price: amounts[0], salePrice: amounts[1] };
  }

  return {
    price: parsePrice(fallbackPrice) || amounts[0] || 0,
    salePrice: onSale && salePrice ? parsePrice(salePrice) : null
  };
}

function normalizeImageUrl(src?: string): string {
  if (!src) return "/hero.webp";

  try {
    const url = new URL(src);
    if (IMAGE_PROXY_HOSTS.has(url.hostname)) {
      return `/api/image?src=${encodeURIComponent(url.toString())}`;
    }
    return url.toString();
  } catch {
    return src;
  }
}

function buildModelDescription(brand: string, name: string, category: string): string {
  const model = `${brand} ${name}`.trim();
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory.includes("sneaker")) {
    return `${model} is a designer sneaker model built around a recognizable everyday silhouette, premium construction and versatile styling. The pair works naturally with casual looks while keeping a collectible luxury feel.`;
  }

  if (normalizedCategory.includes("heel")) {
    return `${model} is a refined heel model shaped for polished evening looks and elevated occasion dressing. The design focuses on a clean silhouette, balanced proportions and a luxury finish.`;
  }

  if (normalizedCategory.includes("bag")) {
    return `${model} is a luxury bag model designed for daily styling and statement wardrobe rotation. The silhouette balances practical carry space with a polished designer profile.`;
  }

  if (normalizedCategory.includes("clothes")) {
    return `${model} is a ready-to-wear model made for elevated everyday styling. The piece focuses on premium construction, an easy silhouette and a designer wardrobe feel.`;
  }

  if (normalizedCategory.includes("accessor")) {
    return `${model} is a designer accessory model selected for refined daily styling and wardrobe finishing. The piece adds a polished luxury detail without overpowering the look.`;
  }

  return `${model} is a luxury designer model selected for versatile styling, premium construction and a refined wardrobe presence.`;
}

function inferSizes(product: WooProduct, categoriesText: string): string[] {
  const sizeAttr = product.attributes?.find(attr => {
    const name = attr.name.toLowerCase();
    return name === "size" || name === "розмір";
  });

  let fallback: string[] = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
  if (categoriesText.includes("heels") || categoriesText.includes("каблук") || categoriesText.includes("туфлі")) {
    fallback = ["35", "36", "37", "38", "39", "40", "41"];
  } else if (
    categoriesText.includes("accessories") ||
    categoriesText.includes("bags") ||
    categoriesText.includes("сумк") ||
    categoriesText.includes("аксесуар")
  ) {
    fallback = ["One Size"];
  } else if (categoriesText.includes("clothes") || categoriesText.includes("одяг")) {
    fallback = ["XS", "S", "M", "L", "XL"];
  }

  return (sizeAttr?.options || fallback)
    .map(String)
    .filter(size => Number.isNaN(Number(size)) || Number(size) <= 50);
}

function mapProduct(product: WooProduct): Product {
  const categories = product.categories || [];
  const isMenswear = categories.some(entry => entry.slug === "menswear");
  const isWomenswear = categories.some(entry => entry.slug === "womenswear");
  const categoriesText = categories.map(category => stripHtml(category.name).toLowerCase()).join(" ") || "sneakers";
  const category =
    stripHtml(categories.find(entry => entry.slug !== "in-stock" && !GENDER_CATEGORY_SLUGS.has(entry.slug || ""))?.name) ||
    "Sneakers";
  const brandAttr = product.attributes?.find(attr => attr.name.toLowerCase() === "brand");
  const colorAttr = product.attributes?.find(attr => {
    const name = attr.name.toLowerCase();
    return name === "color" || name === "колір";
  });
  const productName = stripHtml(product.name);
  const brand = stripHtml(product.brands?.[0]?.name || brandAttr?.options?.[0] || "DRIP.");
  const image = normalizeImageUrl(product.images?.[0]?.src);
  const price = parsePriceHtml(product.price_html, product.price || product.regular_price, product.sale_price, product.on_sale);

  return {
    id: String(product.id),
    brand,
    name: productName,
    price: price.price,
    salePrice: price.salePrice,
    color: stripHtml(colorAttr?.options?.[0]).toLowerCase() || "black",
    sizes: inferSizes(product, categoriesText),
    isNew: Boolean(product.tags?.some(tag => tag.name.toLowerCase() === "new")),
    inStock: categories.some(entry => entry.slug === "in-stock"),
    category,
    gender: isMenswear && !isWomenswear ? "Men" : isWomenswear && !isMenswear ? "Women" : "Unisex",
    description: stripHtml(product.short_description || product.description) || buildModelDescription(brand, productName, category),
    image,
    images: product.images?.map(img => normalizeImageUrl(img.src)) || [image]
  };
}

export async function fetchWooProducts(): Promise<Product[]> {
  const { key, secret } = getWooCredentials();
  const allProducts: WooProduct[] = [];
  let page = 1;

  while (true) {
    const url = new URL(`${WC_URL}/wp-json/wc/v3/products`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`WooCommerce returned ${response.status}`);
    }

    const products = (await response.json()) as WooProduct[];
    allProducts.push(...products);

    if (products.length < 100) break;
    page += 1;
  }

  return allProducts.map(mapProduct);
}

export const getCachedWooProducts = unstable_cache(fetchWooProducts, ["woo-products"], {
  revalidate: 300
});
