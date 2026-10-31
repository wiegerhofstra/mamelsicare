import type { APIRoute } from "astro";
import { getSiteContent } from "../lib/cms/data";
import { escapeHtml } from "../lib/cms/rich-text";

export const GET: APIRoute = async ({ site }) => {
  const { pages } = await getSiteContent();
  const urls = pages.map((page) => `<url><loc>${escapeHtml(new URL(page.href, site).href)}</loc></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
