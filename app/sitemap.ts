import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/cms/data";
import { pageHref } from "@/lib/cms/content";
import { site } from "@/lib/site";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return (await getSiteContent()).pages.map((page) => ({
    url: new URL(pageHref(page.slug), site.url).href,
  }));
}
