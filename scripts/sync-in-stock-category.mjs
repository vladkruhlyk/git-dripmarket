import { fetchAll, wooFetch } from "./lib/woo-api.mjs";

const CATEGORY_NAME = "In Stock";
const CATEGORY_SLUG = "in-stock";
const write = process.argv.includes("--write");

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
