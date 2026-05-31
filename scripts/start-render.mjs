import { cpSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";

const standaloneDir = ".next/standalone";
const standaloneNextDir = `${standaloneDir}/.next`;

if (existsSync(".next/static")) {
  mkdirSync(standaloneNextDir, { recursive: true });
  cpSync(".next/static", `${standaloneNextDir}/static`, { recursive: true });
}

if (existsSync("public")) {
  cpSync("public", `${standaloneDir}/public`, { recursive: true });
}

const server = spawn("node", [`${standaloneDir}/server.js`], {
  stdio: "inherit",
  env: process.env
});

const genderSync = spawn("node", ["scripts/sync-product-genders.mjs", "--write"], {
  stdio: "inherit",
  env: process.env
});

genderSync.on("exit", code => {
  console.log(`WooCommerce product gender sync exited with code ${code ?? 0}`);
});

server.on("exit", code => {
  process.exit(code ?? 0);
});
