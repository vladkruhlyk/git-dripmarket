import { fetchAll, wooFetch } from "./lib/woo-api.mjs";

const write = process.argv.includes("--write");

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

function stripHtml(value = "") {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, "")).trim();
}

function buildModelDescription(brand, name, category) {
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

function getBrand(product) {
  const brandAttr = product.attributes?.find(attr => attr.name.toLowerCase() === "brand");
  return stripHtml(product.brands?.[0]?.name || brandAttr?.options?.[0] || "DRIP.");
}

const products = await fetchAll("products");
const updates = products.flatMap(product => {
  const descriptionEmpty = !stripHtml(product.description);
  const shortDescriptionEmpty = !stripHtml(product.short_description);
  if (!descriptionEmpty && !shortDescriptionEmpty) return [];

  const brand = getBrand(product);
  const name = stripHtml(product.name);
  const category = stripHtml(product.categories?.[0]?.name) || "Sneakers";
  const description = `<p>${buildModelDescription(brand, name, category)}</p>`;
  const payload = {};

  if (descriptionEmpty) payload.description = description;
  if (shortDescriptionEmpty) payload.short_description = description;

  return [{ id: product.id, name, payload }];
});

console.log(`${write ? "Updating" : "Would update"} ${updates.length} of ${products.length} products`);

for (const update of updates) {
  console.log(`${write ? "Updating" : "Would update"} #${update.id} ${update.name}`);
  if (!write) continue;
  await wooFetch(`products/${update.id}`, {
    method: "PUT",
    body: JSON.stringify(update.payload)
  });
}

if (!write) {
  console.log("Dry run only. Run with --write to update WooCommerce.");
}
