// A stable media URL, e.g. app/media/[assetId]/route.ts in Next.js. Render /media/<assetId> in your pages.
// The asset ID always refers to the same file; a replaced file gets a new ID, so links to an ID never show different content.
import { CmsApiError, createCmsClient } from "../client";

const assetIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cms() {
  return createCmsClient({
    origin: process.env.CMS_URL ?? "https://cms.fourd.nl",
    tenantSlug: process.env.CMS_TENANT_SLUG ?? "mameliscare",
    token: process.env.CMS_ACCESS_TOKEN ?? "",
  });
}

export async function GET(_request: Request, context: { params: Promise<{ assetId: string }> }): Promise<Response> {
  const { assetId } = await context.params;
  if (!assetIdPattern.test(assetId)) return new Response(null, { status: 404 });
  try {
    const { data } = await cms().getAsset(assetId);
    // The signed URL is valid for 300 seconds, so the redirect may only be cached briefly.
    // To cache for longer, fetch data.url and stream the bytes with an immutable Cache-Control instead.
    return new Response(null, { status: 302, headers: { Location: data.url, "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    if (error instanceof CmsApiError && error.status === 404) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}
