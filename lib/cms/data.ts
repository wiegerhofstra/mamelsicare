import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createCmsClient } from "./client";
import {
  normalizePage,
  pageHref,
  record,
  text,
  type NavItem,
  type Page,
} from "./content";

export function cmsClient() {
  const { CMS_URL, CMS_TENANT_SLUG, CMS_ACCESS_TOKEN } = process.env;
  if (!CMS_URL || !CMS_TENANT_SLUG || !CMS_ACCESS_TOKEN)
    throw new Error("CMS server configuration is incomplete");
  return createCmsClient({
    origin: CMS_URL,
    tenantSlug: CMS_TENANT_SLUG,
    token: CMS_ACCESS_TOKEN,
    timeoutMs: 10000,
  });
}

export async function getSiteContent(): Promise<{
  pages: Page[];
  navigation: NavItem[];
}> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  cacheTag("cms");
  const client = cmsClient();
  const pages = new Map<string, Page>();
  for await (const entry of client.iterateEntries("page", {
    limit: 100,
    maxDepth: 1,
  })) {
    const page = normalizePage(entry);
    if (page && !pages.has(page.slug)) pages.set(page.slug, page);
  }
  const menus = [];
  for await (const menu of client.iterateEntries("menu", {
    limit: 100,
    maxDepth: 2,
  }))
    menus.push(menu);
  const menu =
    menus.find(
      (m) =>
        text(record(m.data).internal_name).toLowerCase() ===
        (process.env.CMS_MENU_NAME ?? "Top menu").toLowerCase(),
    ) ?? menus[0];
  const navigation: NavItem[] = [];
  const items = record(menu?.data).items;
  if (Array.isArray(items)) {
    for (const item of items) {
      // Expanded page components only; unknown or unresolved components are safely omitted.
      const page = normalizePage(item);
      if (!page) continue;
      if (!pages.has(page.slug)) pages.set(page.slug, page);
      const href = pageHref(page.slug);
      if (!navigation.some((link) => link.href === href))
        navigation.push({ title: page.title, href });
    }
  }
  return { pages: [...pages.values()], navigation };
}

export async function getPage(slug: string): Promise<Page | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  cacheTag("cms");
  const entry = await cmsClient().findEntryBySlug("page", slug, {
    maxDepth: 2,
  });
  return normalizePage(entry);
}
