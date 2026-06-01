import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: directory });

const config = [
  {
    ignores: [".next/**", ".next-dev/**", "node_modules/**", "out/**", "dist/**", "build/**"]
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "@next/next/no-page-custom-font": "off"
    }
  }
];

export default config;
