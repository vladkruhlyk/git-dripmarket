const WC_URL = process.env.WC_URL || "https://cms.dripmarketua.store";
const WC_KEY = process.env.WC_KEY;
const WC_SECRET = process.env.WC_SECRET;
const CATEGORY_NAME = "In Stock";
const CATEGORY_SLUG = "in-stock";
const write = process.argv.includes("--write");

if (!WC_KEY || !WC_SECRET) {
  throw new Error("Set WC_KEY and WC_SECRET to a WooCommerce Read/Write REST API key.");
}

async function wooFetch(path, init = {}) {
  const url = new URL(`${WC_URL}/wp-json/wc/v3/${path}`);
  url.searchParams.set("consumer_key", WC_KEY);
  url.searchParams.set("consumer_secret", WC_SECRET);

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function fetchAll(path) {
  const entries = [];
  let page = 1;

  while (true) {
    const batch = await wooFetch(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    entries.push(...batch);
    if (batch.length < 100) return entries;
    page += 1;
  }
}

const categories = await fetchAll("products/categories");
let category = categories.find(entry => entry.slug === CATEGORY_SLUG);

if (!category) {
  console.log(`${write ? "Creating" : "Would create"} category: ${CATEGORY_NAME}`);
  if (write) {
    category = await wooFetch("products/categories", {
      method: "POST",
      body: JSON.stringify({ name: CATEGORY_NAME, slug: CATEGORY_SLUG })
    });
  }
}

const products = await fetchAll("products");
const updates = products.flatMap(product => {
  const categoryIds = product.categories.map(entry => entry.id);
  const hasCategory = category ? categoryIds.includes(category.id) : false;
  const shouldHaveCategory = product.stock_status === "instock";

  if (hasCategory === shouldHaveCategory) return [];

  const nextCategoryIds = shouldHaveCategory
    ? category ? [...categoryIds, category.id] : categoryIds
    : category ? categoryIds.filter(id => id !== category.id) : categoryIds;

  return [{
    id: product.id,
    name: product.name,
    action: shouldHaveCategory ? "add" : "remove",
    categories: nextCategoryIds.map(id => ({ id }))
  }];
});

console.log(`${write ? "Updating" : "Would update"} ${updates.length} of ${products.length} products`);

for (const update of updates) {
  console.log(`${write ? "Updating" : "Would update"} #${update.id} ${update.name}: ${update.action} ${CATEGORY_NAME}`);
  if (!write) continue;

  await wooFetch(`products/${update.id}`, {
    method: "PUT",
    body: JSON.stringify({ categories: update.categories })
  });
}

if (!write) {
  console.log("Dry run only. Run with --write to update WooCommerce.");
}
