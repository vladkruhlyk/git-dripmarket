import { createClient } from "@sanity/client";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

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

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

const products = await client.fetch(`*[_type == "product" && defined(brand) && !defined(brand._ref)]{
  _id,
  brand
}`);
const brands = [...new Set(products.map(product => product.brand).filter(Boolean))].sort();

for (const name of brands) {
  await client.createIfNotExists({
    _id: `brand-${slug(name)}`,
    _type: "brand",
    name,
    slug: { _type: "slug", current: slug(name) }
  });
}

for (const product of products) {
  await client.patch(product._id).set({
    brand: {
      _type: "reference",
      _ref: `brand-${slug(product.brand)}`
    }
  }).commit();
}

console.log(`Created ${brands.length} brands and linked ${products.length} products.`);
