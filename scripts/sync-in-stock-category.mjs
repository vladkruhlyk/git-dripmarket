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

if (category) {
  console.log(`Category ready: #${category.id} ${category.name}`);
} else {
  console.log("Dry run only. Run with --write to update WooCommerce.");
}
