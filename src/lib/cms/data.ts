import { createCmsClient, CmsApiError } from "./client";
import { collectSiteContent } from "./site-content";

async function fetchSiteContent() {
  const { CMS_URL, CMS_TENANT_SLUG, CMS_ACCESS_TOKEN, CMS_MENU_NAME } = import.meta.env;
  if (!CMS_URL || !CMS_TENANT_SLUG || !CMS_ACCESS_TOKEN) {
    throw new Error("Set CMS_URL, CMS_TENANT_SLUG and CMS_ACCESS_TOKEN in the private build environment or .env.local.");
  }
  const client = createCmsClient({ origin: CMS_URL, tenantSlug: CMS_TENANT_SLUG, token: CMS_ACCESS_TOKEN });
  try {
    return await collectSiteContent(client, CMS_MENU_NAME || "Top menu");
  } catch (error) {
    if (error instanceof CmsApiError) {
      throw new Error(`CMS build failed: ${error.status} ${error.code}; request ID: ${error.requestId ?? "unavailable"}`);
    }
    throw error;
  }
}

// Shared only for this production build. Dev reads fresh content on each request.
// No disk cache: every deployment must fetch newly published content.
let buildContent: ReturnType<typeof fetchSiteContent> | undefined;
export function getSiteContent() {
  if (import.meta.env.DEV) return fetchSiteContent();
  return buildContent ??= fetchSiteContent();
}
