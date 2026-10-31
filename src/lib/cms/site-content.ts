import type { createCmsClient } from "./client";
import { isExpandedEntry, modelSlugById } from "./types";
import { normalizePage, record, text, type NavItem, type Page } from "./content";

export async function collectSiteContent(client: ReturnType<typeof createCmsClient>, menuName = "Top menu") {
  const pages = new Map<string, Page>();
  const paths = new Map<string, string>();
  function add(entry: unknown) {
    if (record(entry).url === null) return;
    const page = normalizePage(entry);
    if (!page) throw new Error("A published CMS page has an invalid title, slug or URL. Correct it before rebuilding.");
    if (/^\/(?:404(?:\.html)?|robots\.txt|sitemap\.xml|_astro)(?:\/|$)/.test(page.href)) {
      throw new Error(`CMS page conflicts with a reserved route: ${page.href}`);
    }
    const existing = paths.get(page.href);
    if (existing && existing !== page.id) throw new Error(`Duplicate CMS route: ${page.href}`);
    if (!pages.has(page.id)) {
      paths.set(page.href, page.id);
      pages.set(page.id, page);
    }
    return pages.get(page.id);
  }
  // Use the CMS default locale (currently 'en', with Dutch editorial content).
  for await (const entry of client.iterateEntries("page", { limit: 100, maxDepth: 2 })) add(entry);
  const menus = [];
  for await (const menu of client.iterateEntries("menu", { limit: 100, maxDepth: 2 })) menus.push(menu);
  const menu = menus.find((m) => text(record(m.data).internal_name).toLowerCase() === menuName.toLowerCase()) ?? menus[0];
  const navigation: NavItem[] = [];
  const items = record(menu?.data).items;
  if (Array.isArray(items)) {
    for (const item of items) {
      const ref = record(item);
      if (modelSlugById[text(ref.modelId)] !== "page") continue;
      let page = pages.get(text(ref.id));
      if (!page) {
        // Child entries can be absent from collections; resolve compact menu references once.
        const entry = isExpandedEntry(item) ? item : (await client.getEntry("page", text(ref.id), { maxDepth: 2 })).data;
        page = add(entry);
      }
      if (page && !navigation.some((link) => link.href === page.href)) navigation.push({ title: page.title, href: page.href });
    }
  }
  if (!paths.has("/")) throw new Error("Publish a CMS page at /home or / before building the homepage.");
  return { pages: [...pages.values()], navigation };
}
