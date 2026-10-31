import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";

export default tseslint.config(
  { ignores: ["dist/**", ".astro/**", ".next/**", "docs/**", "cms-mameliscare-integration/**", "playwright-report/**", "test-results/**"] },
  { files: ["src/**/*.ts", "tests/**/*.ts"], extends: [js.configs.recommended, ...tseslint.configs.recommended] },
  // These expressions intentionally reject control characters in CMS URLs.
  { files: ["src/lib/cms/content.ts"], rules: { "no-control-regex": "off" } },
  // Log only CMS status/code/request ID; do not expose arbitrary upstream messages.
  { files: ["src/lib/cms/data.ts"], rules: { "preserve-caught-error": "off" } },
  ...astro.configs.recommended,
);
