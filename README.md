# Mamelis Care

Dutch public website for patients, families and referring healthcare professionals. Built with Next.js 16.4 App Router, React Server Components and Cache Components. The published CMS pages and photographs are used directly; the CMS export is retained in `cms-mameliscare-integration/` as reference material.

## Local development

Use Node.js 22.18+ (or Node.js 24+) and npm.

```sh
npm ci
cp .env.example .env.local
# Fill in the server-only credentials.
npm run dev
```

Open http://localhost:3000. `npm run build` creates the production build; `npm start` serves it. CMS access is required at build time to prerender the published pages.

```sh
npm run lint
npm test
npm run build
```

The tests cover untrusted CMS fields, safe links, bounded rich-text normalization, FAQ grouping and webhook authentication.

## CMS integration

Required server variables:

- `CMS_URL`: CMS origin, currently `https://cms.fourd.nl`.
- `CMS_TENANT_SLUG`: `mameliscare`.
- `CMS_ACCESS_TOKEN`: tenant-scoped delivery token. Never expose it using `NEXT_PUBLIC_`.
- `CMS_REVALIDATION_SECRET`: same bearer secret configured in the CMS revalidation settings.
- `SITE_URL`: final public origin, used for canonical links and sitemap. Defaults to `https://www.mameliscare.nl`.
- `CMS_MENU_NAME`: optional menu internal name; defaults to `Top menu`.

`lib/cms/client.ts`, `types.ts` and `revalidation.ts` originate from the export. `lib/cms/data.ts` adds server-only cached queries; `content.ts` validates and normalizes the delivered values. The React rich-text renderer escapes text and explicitly supports the editor's paragraphs, headings, lists, marks, media, tables, quotes and code. Unknown nodes retain their children, unsafe links become text, and missing optional fields are tolerated.

The CMS currently calls its only locale `en`, but the entries are written in Dutch. Requests use the configured default CMS locale; the website correctly declares `lang="nl"`. Do not send `locale=nl` until that locale exists in the CMS.

### Publishing and refresh

All CMS content uses the `cms` cache tag. It becomes eligible for background refresh after 60 seconds, on the next visit. To make a published change available on the next request immediately, configure this endpoint in **CMS Settings → Revalidation**:

```text
POST https://<public-domain>/api/revalidate
Authorization: Bearer <CMS_REVALIDATION_SECRET>
```

The endpoint is implemented and authenticated. Register the final HTTPS deployment URL in the CMS. Publishing alone does not send this webhook; use the CMS **Revalidate** button or rely on the timed refresh. The webhook invalidates all CMS page/navigation/sitemap caches without synchronously rebuilding the site.

### Pages and images

- CMS page `home` appears at `/`; `/home` redirects to `/`.
- Other pages render at `/<slug>` and receive page-specific metadata. Newly published slugs work without redeployment.
- The `Top menu` component order controls navigation. WNT remains available through the footer.
- Patient questions ending in `?` become native, keyboard-accessible disclosure panels. Answers and visiting hours remain CMS content.
- Cover images and rich-text media use permanent `/media/<asset-id>` URLs. Signed storage URLs are stripped before content is cached. The media route fetches a fresh signed URL, streams the bytes, and caches immutable assets by ID. Raster images use Next.js image optimization; other files download as attachments.
- A deleted or invalid media ID returns 404; CMS delivery errors are not mistaken for a missing page.

## Content ownership

All main page text, FAQs, visiting hours, menu order, and photographs are edited in the CMS. The homepage's short display headings, navigation labels, audience links and care summaries are presentation copy in `app/page.tsx` and `components/`.

The exported schema has no structured site-settings model or image alt-text field. Shared contact details and address, verified against the published contact page, are centralized in `lib/site.ts`; update them there if they change. Add a CMS site-settings model to make these independently editable. Contextual homepage image descriptions are in code, and decorative images have empty alt text.

The CMS currently has WNT year labels without downloadable documents. They render as text; add document assets/links to that page when available. Privacy and policy statements are requested by email, as described in the CMS.

## Design and accessibility

The supplied logo sets the turquoise/slate palette. Figtree is self-hosted by `next/font`; no Google font requests occur in the visitor's browser. The site includes mobile navigation, visible keyboard focus, a skip link, reduced-motion support, native FAQ disclosures, and direct phone/email actions. No analytics, contact-form storage, or embedded third-party maps are added.

## Deployment

Deploy to a platform supporting the Next.js server runtime; static export cannot provide the media and revalidation routes. Set the server variables before building. Register the public revalidation endpoint in the CMS and verify it there after deployment.

On multiple server instances, configure a shared Next.js cache handler so webhook invalidation reaches every instance. The default cache is appropriate for a single long-running server; the 60-second refresh also bounds ordinary content staleness.
