import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");

export default defineConfig({
  site: process.env.SITE_URL || env.SITE_URL || "https://www.mameliscare.nl",
  output: "static",
  trailingSlash: "never",
  server: { port: 3000 },
  redirects: { "/home": { destination: "/", status: 308 } },
  vite: { plugins: [tailwindcss()] },
});
