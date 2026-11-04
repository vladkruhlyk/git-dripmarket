import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@sanity/client";

// Usage: node --env-file=.env.local scripts/import-brand-products.mjs --file products.json [--dry-run]
// Each entry: { brand, category, gender, sku, url, name, price, cur, desc, imgs[], imageUrls?[], color?, sizes? }
// imgs are uploaded to Sanity (http URLs or local file paths); imageUrls are stored as links only.
// Our price is the brand price converted at the NBU rate, minus a stable 10–18% discount per SKU.

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_TOKEN in .env.local.");
}

const fileIndex = process.argv.indexOf("--file");
const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : "";
const dryRun = process.argv.includes("--dry-run");

if (!file) {
  throw new Error("Usage: node scripts/import-brand-products.mjs --file /path/to/products.json [--dry-run]");
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-02-19",
  useCdn: false
});

const MIN_DISCOUNT = 0.10;
const MAX_DISCOUNT = 0.18;

function slug(value) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Size and line codes that stay upper-case in product names.
const MODEL_CODES = new Set(["LV", "GG", "MM", "PM", "GM", "BB", "NM"]);

function titleCase(value) {
  const small = new Set(["in", "and", "with", "of", "the", "a"]);
  return value
    .split(" ")
    .map(word => (MODEL_CODES.has(word.toUpperCase()) ? word.toUpperCase() : word.toLowerCase()))
    .join(" ")
    .replace(/(^|[\s-])(\p{L})/gu, (match, gap, letter) => gap + letter.toUpperCase())
    .replace(/ (In|And|With|Of|The|A)(?= )/g, word => (small.has(word.trim().toLowerCase()) ? word.toLowerCase() : word));
}

function discountFor(sku) {
  const hash = createHash("sha1").update(sku).digest().readUInt32BE(0);
  return MIN_DISCOUNT + (hash / 0xffffffff) * (MAX_DISCOUNT - MIN_DISCOUNT);
}

function cleanDescription(value = "") {
  return value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function nbuRates() {
  const response = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json");
  if (!response.ok) throw new Error(`NBU rates request failed: ${response.status}`);
  return Object.fromEntries((await response.json()).map(rate => [rate.cc, rate.rate]));
}

async function uploadImages(entry) {
  const images = [];

  for (const [index, src] of (entry.imgs || []).entries()) {
    let body;
    if (/^https?:\/\//.test(src)) {
      const response = await fetch(src);
      if (!response.ok) {
        console.warn(`  skip image ${src} (${response.status})`);
        continue;
      }
      body = Buffer.from(await response.arrayBuffer());
    } else {
      body = await readFile(src);
    }
    const asset = await client.assets.upload("image", body, {
      filename: `${slug(entry.sku)}-${index + 1}.jpg`
    });
    images.push({
      _key: `${slug(entry.sku)}-${index + 1}`,
      _type: "image",
      asset: { _type: "reference", _ref: asset._id }
    });
  }

  return images;
}

const entries = JSON.parse(await readFile(file, "utf8"));
const rates = await nbuRates();
const existing = await client.fetch(`{
  "ids": *[_type == "product" && defined(externalId)].externalId,
  "slugs": *[_type == "product"].slug.current,
  "names": *[_type == "product"]{name, color, "brand": brand->name},
  "brands": *[_type == "brand"]{_id, name}
}`);
const existingIds = new Set(existing.ids);
const usedSlugs = new Set(existing.slugs);
const brandIds = new Map(existing.brands.map(brand => [brand.name, brand._id]));
// Colour is part of the key so colourways that share a name (e.g. "LV Trainer") stay separate products.
const nameKey = (brand, name, color = "") => `${brand}|${name}|${color}`.toLowerCase();
const existingNames = new Set(existing.names.map(product => nameKey(product.brand, product.name, product.color || "")));

for (const entry of entries) {
  if (existingIds.has(entry.sku)) {
    console.log(`= ${entry.brand} ${entry.name} already imported`);
    continue;
  }

  const key = nameKey(entry.brand, titleCase(entry.name), entry.color || "");
  // allowSameName: the source lists colourways under one name without a colour, so only the SKU tells them apart.
  if (!entry.allowSameName && existingNames.has(key)) {
    console.log(`= ${entry.brand} ${entry.name} already exists by name`);
    continue;
  }
  existingNames.add(key);

  if (typeof entry.price !== "number" || !(entry.price > 0)) {
    console.warn(`! ${entry.brand} ${entry.name}: no valid price (${entry.price}), skipped`);
    continue;
  }

  const brandId = brandIds.get(entry.brand);
  const rate = rates[entry.cur.toUpperCase()];
  if (!brandId) throw new Error(`Unknown brand "${entry.brand}" — create it in Sanity first.`);
  if (!rate) throw new Error(`No NBU rate for ${entry.cur}`);

  const discount = discountFor(entry.sku);
  const price = Math.round((entry.price * rate * (1 - discount)) / 10) * 10;
  const name = titleCase(entry.name);
  let productSlug = slug(`${entry.brand} ${name}`);
  if (usedSlugs.has(productSlug)) productSlug = `${productSlug}-${slug(entry.sku)}`;
  usedSlugs.add(productSlug);

  console.log(`+ ${entry.brand} ${name}: ${entry.price} ${entry.cur} -> ${price} UAH (-${(discount * 100).toFixed(1)}%)`);
  if (dryRun) continue;

  const images = await uploadImages(entry);
  const imageUrls = entry.imageUrls || [];
  if (images.length === 0 && imageUrls.length === 0) {
    console.warn(`  no images, skipped`);
    continue;
  }

  await client.create({
    _type: "product",
    name,
    slug: { _type: "slug", current: productSlug },
    externalId: entry.sku,
    brand: { _type: "reference", _ref: brandId },
    category: entry.category,
    gender: entry.gender,
    price,
    ...(entry.color ? { color: entry.color } : {}),
    sizes: entry.sizes?.length ? entry.sizes : ["One Size"],
    ...(images.length ? { images } : {}),
    ...(imageUrls.length ? { imageUrls } : {}),
    description: cleanDescription(entry.desc),
    isNew: true,
    inStock: false
  });
  console.log(`  created with ${images.length} uploaded and ${imageUrls.length} linked image(s)`);
}
