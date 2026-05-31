import { fetchAll, wooFetch } from "./lib/woo-api.mjs";

const write = process.argv.includes("--write");
const GENDER_CATEGORIES = {
  Men: { name: "Menswear", slug: "menswear" },
  Women: { name: "Womenswear", slug: "womenswear" },
  Unisex: { name: "Unisex", slug: "unisex" }
};

function decodeHtmlEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\""
  };

  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, code) => {
    const normalized = code.toLowerCase();
    if (normalized[0] === "#") {
      const radix = normalized.startsWith("#x") ? 16 : 10;
      const numericValue = Number.parseInt(normalized.replace(/^#x?/, ""), radix);
      return Number.isFinite(numericValue) ? String.fromCodePoint(numericValue) : entity;
    }
    return namedEntities[normalized] || entity;
  });
}

function normalize(value = "") {
  return decodeHtmlEntities(value).toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

function getBrand(product) {
  const brandAttr = product.attributes?.find(attr => normalize(attr.name) === "brand");
  return normalize(product.brands?.[0]?.name || brandAttr?.options?.[0]);
}

function classifySneakers(brand, name) {
  if (brand.includes("miu miu") || brand.includes("chanel") || brand.includes("saint laurent")) return "Women";
  if (brand.includes("givenchy") && name.includes("shark lock")) return "Women";
  if (brand.includes("hermes") && name.includes("oran")) return "Women";
  if (brand.includes("dior") && name.includes("walk'n'dior")) return "Women";
  if (brand.includes("gucci") && name.includes("platform")) return "Women";

  if (name.includes("men's")) return "Men";
  if (brand.includes("louis vuitton") && /(trainer|skate)/.test(name)) return "Men";
  if (brand.includes("dior") && /\b(b27|b30|b33)\b/.test(name)) return "Men";
  if (brand.includes("celine")) return "Men";

  return "Unisex";
}

function classifyProduct(product) {
  const name = normalize(product.name);
  const brand = getBrand(product);
  const category =
    product.categories?.find(entry => !["in-stock", "menswear", "womenswear", "unisex"].includes(entry.slug))?.slug || "";

  if (name.includes("women's")) return "Women";
  if (name.includes("men's")) return "Men";
  if (category === "heels") return "Women";

  if (category === "bags") {
    if (brand.includes("goyard")) return "Unisex";
    return "Women";
  }

  if (category === "clothes") {
    if (brand.includes("ami") || brand.includes("moncler")) return "Men";
    return "Unisex";
  }

  if (category === "sneakers") return classifySneakers(brand, name);
  return "Unisex";
}

const categories = await fetchAll("products/categories");
const genderCategories = {};

for (const [gender, definition] of Object.entries(GENDER_CATEGORIES)) {
  let category = categories.find(entry => entry.slug === definition.slug);
  if (!category && write) {
    console.log(`Creating category: ${definition.name}`);
    category = await wooFetch("products/categories", {
      method: "POST",
      body: JSON.stringify(definition)
    });
  }
  genderCategories[gender] = category;
}

if (!write && Object.values(genderCategories).some(category => !category)) {
  console.log("Would create missing gender categories.");
}

const products = await fetchAll("products");
const genderCategoryIds = new Set(Object.values(genderCategories).filter(Boolean).map(category => category.id));
const counts = { Men: 0, Women: 0, Unisex: 0 };
const updates = products.map(product => {
  const gender = classifyProduct(product);
  const genderCategory = genderCategories[gender];
  counts[gender] += 1;

  return {
    id: product.id,
    name: product.name,
    gender,
    categories: [
      ...(product.categories || []).filter(category => !genderCategoryIds.has(category.id)).map(category => ({ id: category.id })),
      ...(genderCategory ? [{ id: genderCategory.id }] : [])
    ]
  };
});

console.log(`${write ? "Updating" : "Would update"} ${updates.length} products`);
console.log(`Menswear: ${counts.Men}, Womenswear: ${counts.Women}, Unisex: ${counts.Unisex}`);

if (write) {
  for (let index = 0; index < updates.length; index += 100) {
    const batch = updates.slice(index, index + 100).map(update => ({
      id: update.id,
      categories: update.categories
    }));

    await wooFetch("products/batch", {
      method: "POST",
      body: JSON.stringify({ update: batch })
    });

    console.log(`Updated batch ${Math.floor(index / 100) + 1} of ${Math.ceil(updates.length / 100)}`);
  }
}

if (!write) {
  console.log("Dry run only. Run with --write to update WooCommerce.");
}
