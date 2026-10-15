import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = defineConfig([
  // eslint-config-next@15 ships legacy (eslintrc-style) configs, so consume
  // them through FlatCompat instead of the Next 16 flat-config entrypoints.
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
