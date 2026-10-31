import { expect, test } from "@playwright/test";

test("published pages have content, metadata, working internal links and no runtime CMS requests", async ({ page, request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const urls = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]));
  expect(urls.length).toBeGreaterThan(1);
  const errors: string[] = [];
  const runtimeRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (req) => {
    if (/\/api\/content\/|\/_next\/|\/api\/revalidate/.test(req.url())) runtimeRequests.push(req.url());
  });
  const internalLinks = new Set<string>();
  for (const url of urls) {
    expect((await page.goto(url.pathname))?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "nl");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).not.toBeEmpty();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", url.href);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
    for (const href of await page.locator('a[href^="/"]').evaluateAll((links) => links.map((a) => a.getAttribute("href")!))) internalLinks.add(href);
    if (url.pathname !== "/") {
      const current = page.locator(`#main-navigation a[href="${url.pathname}"]`);
      if (await current.count()) await expect(current).toHaveAttribute("aria-current", "page");
    }
  }
  for (const href of internalLinks) expect((await request.get(href)).ok(), href).toBeTruthy();
  expect(errors).toEqual([]);
  expect(runtimeRequests).toEqual([]);
});

test("mobile navigation opens, closes with Escape, restores focus, and follows links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const button = page.getByRole("button", { name: /^(Menu|Sluiten)$/ });
  const nav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  await expect(nav).toBeHidden();
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(nav).toBeVisible();
  await nav.locator("a").first().focus();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  const firstLink = nav.locator("a").first();
  const href = await firstLink.getAttribute("href");
  await firstLink.click();
  await expect(page).toHaveURL(new RegExp(`${href}/?$`));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("FAQ is keyboard accessible and images use the CMS durable URLs", async ({ page }) => {
  await page.goto("/informatie-voor-patienten");
  const faq = page.locator(".faq-list details").first();
  await faq.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(faq).toHaveAttribute("open", "");
  await expect(faq.locator(".prose")).toBeVisible();
  const image = page.locator(".page-cover");
  await expect(image).toHaveAttribute("src", /^https?:\/\//);
  await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

test("homepage and navigation work without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4322/");
  await expect(page.locator("h1")).toContainText("Alle aandacht.");
  await expect(page.getByRole("navigation", { name: "Hoofdnavigatie" })).toBeVisible();
  await expect(page.locator("#menu-toggle")).toBeHidden();
  await context.close();
});

test("unknown pages return the custom 404 and /home redirects to the homepage", async ({ page }) => {
  expect((await page.goto("/this-page-does-not-exist"))?.status()).toBe(404);
  await expect(page.locator("main")).toContainText("Pagina niet gevonden");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await page.goto("/home");
  await expect(page).toHaveURL("http://127.0.0.1:4322/");
});
