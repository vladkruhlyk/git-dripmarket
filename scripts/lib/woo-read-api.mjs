import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const WC_URL = process.env.WC_URL || "https://cms.dripmarketua.store";
const WC_KEY = process.env.WC_READ_KEY;
const WC_SECRET = process.env.WC_READ_SECRET;

if (!WC_KEY || !WC_SECRET) {
  throw new Error("Set read-only WC_READ_KEY and WC_READ_SECRET in .env.local.");
}

async function wooRead(path) {
  const url = new URL(`${WC_URL}/wp-json/wc/v3/${path}`);
  url.searchParams.set("consumer_key", WC_KEY);
  url.searchParams.set("consumer_secret", WC_SECRET);

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function fetchAllReadOnly(path) {
  const entries = [];
  let page = 1;

  while (true) {
    const batch = await wooRead(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    entries.push(...batch);
    if (batch.length < 100) return entries;
    page += 1;
  }
}
