import assert from "node:assert/strict";
import { test } from "node:test";
import {
  faqSections,
  normalizePage,
  normalizeRichText,
  plainText,
  safeHref,
} from "../lib/cms/content.ts";
import { handleRevalidation } from "../lib/cms/revalidation.ts";

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

test("validates optional fields and removes expiring URLs before caching", () => {
  assert.equal(normalizePage({ data: { title: 42, slug: "contact" } }), null);
  assert.equal(
    normalizePage({ id, data: { title: "Page", slug: "../bad" } }),
    null,
  );
  const page = normalizePage({
    id,
    data: {
      title: "Contact",
      slug: "contact",
      cover_image: {
        id,
        mimeType: "image/jpeg",
        imageWidth: 'bad" onerror="x',
        url: "https://signed.example/secret",
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
                url: "https://signed.example/secret",
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
  assert.ok(!JSON.stringify(page).includes("signed.example"));
  assert.equal(
    normalizePage({ id, data: { title: "Empty", slug: "empty" } })?.content
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

test("revalidation requires the configured bearer secret and invalidates only on success", async () => {
  let calls = 0;
  const options = {
    secret: "test-only-secret",
    invalidate: () => {
      calls++;
    },
  };
  for (const authorization of [
    undefined,
    "Bearer incorrect",
    "test-only-secret",
  ]) {
    const response = await handleRevalidation(
      new Request("https://example.com/api/revalidate", {
        method: "POST",
        headers: authorization ? { authorization } : {},
      }),
      options,
    );
    assert.equal(response.status, 401);
  }
  assert.equal(calls, 0);
  const success = await handleRevalidation(
    new Request("https://example.com/api/revalidate", {
      method: "POST",
      headers: { authorization: "Bearer test-only-secret" },
    }),
    options,
  );
  assert.equal(success.status, 200);
  assert.equal(calls, 1);
  assert.equal(
    (
      await handleRevalidation(
        new Request("https://example.com", { method: "POST" }),
        { ...options, secret: undefined },
      )
    ).status,
    503,
  );
});
