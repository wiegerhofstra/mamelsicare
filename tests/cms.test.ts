import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createCmsClient, CmsApiError } from "../src/lib/cms/client.ts";
import { collectSiteContent } from "../src/lib/cms/site-content.ts";
import { normalizePage, normalizeRichText } from "../src/lib/cms/content.ts";
import { renderRichText } from "../src/lib/cms/rich-text.ts";

const pageModel = "bf45584e-7868-4b02-b431-9d2f3604d6c1";
const entry = (id: string, url: string, slug = url.split("/").at(-1)) => ({
  id, modelId: pageModel, status: "published", url,
  data: { title: id, slug },
});
const response = (data: unknown, nextCursor: string | null = null) => Response.json({ data, meta: { nextCursor, maxDepth: 2, locale: "en" } });
function client(fetcher: typeof fetch) {
  return createCmsClient({ origin: "https://cms.example", tenantSlug: "test", token: "test-only-token", fetch: fetcher });
}

test("CMS supplied fixtures normalize and render without using a runtime media proxy", async () => {
  const fixtures = JSON.parse(await readFile(new URL("../docs/cms/examples/responses.json", import.meta.url), "utf8"));
  const page = normalizePage(fixtures.byModel.page.expanded.data);
  assert.ok(page);
  assert.equal(page.href, "/example-page");
  const html = renderRichText({ type: "doc", content: page.content });
  assert.match(html, /<strong>Synthetic example text<\/strong>/);
  assert.match(html, /https:\/\/example.invalid\/synthetic-image.jpg/);
  assert.equal(renderRichText({ type: "doc", content: normalizeRichText(fixtures.missingRichTextAsset) }), "");
});

test("paginated build uses full URLs, includes menu-only children and preserves menu order", async () => {
  const home = entry("home", "/home");
  const first = entry("first", "/care/stay", "stay");
  const second = entry("second", "/family/stay", "stay");
  const child = entry("child", "/home/child", "child");
  const calls: URL[] = [];
  const cms = client(async (input, init) => {
    const url = new URL(String(input)); calls.push(url);
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-only-token");
    assert.equal(init?.cache, "no-store");
    if (url.pathname.endsWith("/page/entries/child")) return response(child);
    if (url.pathname.endsWith("/page/entries")) {
      return url.searchParams.has("cursor") ? response([second]) : response([home, first], "opaque cursor +");
    }
    return response([{ data: { internal_name: "Top menu", items: [second, { id: "child", modelId: pageModel }, first, second, { id: "unknown", modelId: "unknown" }] } }]);
  });
  const site = await collectSiteContent(cms);
  assert.deepEqual(site.pages.map((page) => page.href), ["/", "/care/stay", "/family/stay", "/home/child"]);
  assert.deepEqual(site.navigation.map((item) => item.href), ["/family/stay", "/home/child", "/care/stay"]);
  assert.equal(calls[1].searchParams.get("cursor"), "opaque cursor +");
  assert.equal(calls[0].searchParams.get("maxDepth"), "2");
});

test("CMS failures retain status and request ID instead of producing an empty site", async () => {
  for (const status of [401, 403, 404, 500]) {
    const cms = client(async () => Response.json({ error: { code: "FAILED", requestId: "test-request" } }, { status }));
    await assert.rejects(() => collectSiteContent(cms), (error: unknown) => error instanceof CmsApiError && error.status === status && error.requestId === "test-request");
  }
});

test("build rejects missing home, invalid pages, duplicate routes and reserved routes", async () => {
  for (const pages of [
    [],
    [entry("bad", "/home", "../bad")],
    [entry("home", "/home"), entry("duplicate", "/", "root")],
    [entry("home", "/home"), entry("reserved", "/404", "404")],
    [entry("home", "/home"), entry("bad", "/x/../y", "y")],
  ]) {
    const cms = client(async (input) => response(String(input).includes("/page/") ? pages : []));
    await assert.rejects(() => collectSiteContent(cms));
  }
});

test("pagination stops with an actionable error when the CMS repeats a cursor", async () => {
  const cms = client(async () => response([], "repeated"));
  await assert.rejects(async () => {
    for await (const item of cms.iterateEntries("page")) void item;
  }, /repeated a pagination cursor/);
});
