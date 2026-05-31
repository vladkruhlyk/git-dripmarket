import { readFile } from "node:fs/promises";
import { wooFetch } from "./lib/woo-api.mjs";

const fileIndex = process.argv.indexOf("--file");
const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : "";

if (!file) {
  throw new Error("Usage: node scripts/add-woo-product.mjs --file /path/to/product.json");
}

const payload = JSON.parse(await readFile(file, "utf8"));

if (!payload.name || !payload.regular_price) {
  throw new Error("Product JSON must include name and regular_price.");
}

const product = await wooFetch("products", {
  method: "POST",
  body: JSON.stringify({
    status: "publish",
    ...payload
  })
});

console.log(`Created WooCommerce product #${product.id}: ${product.name}`);
