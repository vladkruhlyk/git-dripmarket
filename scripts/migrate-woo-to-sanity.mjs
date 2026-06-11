import { createClient } from "@sanity/client";
import { fetchAllReadOnly } from "./lib/woo-read-api.mjs";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_TOKEN in .env.local.");
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-02-19",
  useCdn: false
});

const genderSlugs = new Set(["menswear", "womenswear", "unisex"]);

function text(value = "") {
  return value.replace(/<[^>]*>/g, "").replaceAll("&nbsp;", " ").replaceAll("&amp;", "&").trim();
}

function number(value = "") {
  return Number.parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
}

function slug(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function brandReference(name) {
  const id = `brand-${slug(name) || "unknown"}`;
  await client.createIfNotExists({
    _id: id,
    _type: "brand",
    name,
    slug: { _type: "slug", current: slug(name) || "unknown" }
  });
  return { _type: "reference", _ref: id };
}

function attribute(product, names) {
  return product.attributes?.find(entry => names.includes(entry.name.toLowerCase()))?.options || [];
}

function sizes(product, category) {
  const configured = attribute(product, ["size", "розмір"]);
  if (configured.length) return configured.map(String);
  if (/bag|accessor|сумк|аксесуар/i.test(category)) return ["One Size"];
  if (/clothes|одяг/i.test(category)) return ["XS", "S", "M", "L", "XL"];
  return ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
}

async function uploadImages(product) {
  const images = [];

  for (const [index, image] of (product.images || []).entries()) {
    const response = await fetch(image.src);
    if (!response.ok) throw new Error(`Could not download ${image.src}`);
    const asset = await client.assets.upload("image", Buffer.from(await response.arrayBuffer()), {
      filename: `${product.id}-${index + 1}.jpg`
    });
    images.push({
      _key: `${product.id}-${index + 1}`,
      _type: "image",
      asset: { _type: "reference", _ref: asset._id }
    });
  }

  return images;
}

const products = await fetchAllReadOnly("products?status=publish");
const migratedIds = new Set(await client.fetch(
  `*[_type == "product" && defined(externalId)].externalId`
));
const pendingProducts = products.filter(product => !migratedIds.has(String(product.id)));
console.log(`Migrating ${pendingProducts.length} of ${products.length} products to Sanity...`);

for (const product of pendingProducts) {
  const categories = product.categories || [];
  const category = text(categories.find(entry => !genderSlugs.has(entry.slug) && entry.slug !== "in-stock")?.name || "Other");
  const isMenswear = categories.some(entry => entry.slug === "menswear");
  const isWomenswear = categories.some(entry => entry.slug === "womenswear");
  const brand = text(product.brands?.[0]?.name || attribute(product, ["brand"])[0] || "DRIP.");
  const images = await uploadImages(product);

  await client.createOrReplace({
    _id: `product-${product.id}`,
    _type: "product",
    externalId: String(product.id),
    name: text(product.name),
    slug: { _type: "slug", current: slug(`${product.name}-${product.id}`) },
    brand: await brandReference(brand),
    category,
    gender: isMenswear && !isWomenswear ? "Men" : isWomenswear && !isMenswear ? "Women" : "Unisex",
    price: number(product.regular_price || product.price),
    salePrice: product.on_sale ? number(product.sale_price || product.price) : undefined,
    color: text(attribute(product, ["color", "колір"])[0] || "black").toLowerCase(),
    sizes: sizes(product, category),
    images,
    description: text(product.short_description || product.description),
    isNew: Boolean(product.tags?.some(tag => tag.name.toLowerCase() === "new")),
    inStock: categories.some(entry => entry.slug === "in-stock") || product.stock_status === "instock"
  });

  console.log(`Migrated #${product.id}: ${text(product.name)}`);
}

console.log("Migration complete.");
