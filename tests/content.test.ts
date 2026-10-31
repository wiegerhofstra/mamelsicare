import assert from "node:assert/strict";
import { test } from "node:test";
import {
  faqSections,
  normalizePage,
  normalizeRichText,
  plainText,
  safeHref,
} from "../src/lib/cms/content.ts";
import { renderRichText } from "../src/lib/cms/rich-text.ts";
import { pagePath } from "../src/lib/cms/content.ts";

const id = "f9a72684-d59e-4920-ac84-bc85c4ac302e";
const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

test("rejects unsafe links, including browser-normalized backslashes", () => {
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "//evil.test",
    "/\\evil.test",
    "java\nscript:alert(1)",
    {},
    null,
  ])
    assert.equal(safeHref(href), null);
  for (const href of [
    "/contact",
    "#zorg",
    "https://example.com",
    "mailto:test@example.com",
    "tel:+31433112814",
  ])
    assert.equal(safeHref(href), href);
});

test("validates optional fields and preserves durable media URLs", () => {
  assert.equal(normalizePage({ data: { title: 42, slug: "contact" } }), null);
  assert.equal(
    normalizePage({ id, data: { title: "Page", slug: "../bad" } }),
    null,
  );
  const page = normalizePage({
    id,
    url: "/contact",
    data: {
      title: "Contact",
      slug: "contact",
      cover_image: {
        id,
        mimeType: "image/jpeg",
        imageWidth: 'bad" onerror="x',
        url: "https://media.example/asset",
      },
      content: {
        type: "doc",
        content: [
          {
            type: "asset",
            attrs: {
              asset: {
                id,
                mimeType: "image/jpeg",
                url: "https://media.example/asset",
              },
            },
          },
          null,
          2,
          paragraph("Welkom"),
        ],
      },
    },
  });
  assert.equal(page?.image?.width, 1600);
  assert.equal(plainText(page!.content), "Welkom");
  assert.equal(page?.image?.url, "https://media.example/asset");
  assert.match(renderRichText({ type: "doc", content: page!.content }), /src="https:\/\/media.example\/asset"/);
  assert.equal(
    normalizePage({ id, url: "/empty", data: { title: "Empty", slug: "empty" } })?.content
      .length,
    0,
  );
});

test("bounds malformed and deeply nested rich text", () => {
  let document: unknown = paragraph("Deep");
  for (let i = 0; i < 100; i++) document = { type: "doc", content: [document] };
  assert.doesNotThrow(() => normalizeRichText(document));
  assert.deepEqual(normalizeRichText(null), []);
  const nodes = normalizeRichText({
    type: "doc",
    content: [
      null,
      {},
      { type: "paragraph", attrs: 4, marks: [null], content: "invalid" },
      paragraph("Safe"),
    ],
  });
  assert.equal(plainText(nodes), "Safe");
});

test("FAQ grouping preserves multi-paragraph answers, lists and trailing content", () => {
  const nodes = normalizeRichText({
    type: "doc",
    content: [
      {
        type: "heading",
        content: [{ type: "text", text: "Veelgestelde vragen" }],
      },
      paragraph("Wanneer kan ik op bezoek?"),
      paragraph("U bent welkom."),
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [paragraph("11.00–12.00")] }],
      },
      paragraph("Hoe meld ik mij aan?"),
      paragraph("Bel ons."),
      paragraph("Overige informatie"),
      paragraph("Vrijwilligers zijn welkom."),
    ],
  });
  const faq = faqSections(nodes);
  assert.equal(faq.questions.length, 2);
  assert.equal(faq.questions[0].answer.length, 2);
  assert.equal(faq.remainder.length, 2);
  assert.equal(faq.introduction.length, 1);
});

test("uses full delivered paths, normalizes the home alias, and rejects unsafe paths", () => {
  for (const path of ["https://example.com", "//example.com", "/../x", "/a/%2e%2e/x", "/a/%2Fetc", "/a?b", "/a#b", "/a/", "/a//b", "/%ZZ"]) {
    assert.equal(pagePath(path), null, path);
  }
  assert.equal(pagePath("/home"), "/");
  assert.equal(pagePath("/zorg/verblijf"), "/zorg/verblijf");
  const page = normalizePage({ id, url: "/zorg/verblijf", data: { title: "Verblijf", slug: "verblijf" } });
  assert.equal(page?.href, "/zorg/verblijf");
});

test("rich text escapes attributes, honors resolved links and targets, and omits missing assets", () => {
  const nodes = normalizeRichText({ type: "doc", content: [
    { type: "text", text: "<script>alert(1)</script>", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
    { type: "text", text: "Contact", marks: [{ type: "link", attrs: { kind: "page", href: "/contact", target: "_blank" } }] },
    { type: "text", text: "Unavailable", marks: [{ type: "link", attrs: { kind: "page", href: null, missing: true } }] },
    { type: "asset", attrs: { asset: null } },
    { type: "asset", attrs: { asset: { id, mimeType: "application/pdf", originalName: '<img onerror="bad">', url: "https://media.example/pdf", downloadUrl: "https://media.example/download" } } },
  ] });
  const html = renderRichText({ type: "doc", content: nodes });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("javascript:"));
  assert.match(html, /href="\/contact" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /href="https:\/\/media.example\/download"/);
  assert.ok(!html.includes('<img onerror'));
  assert.match(html, /Unavailable/);
});
