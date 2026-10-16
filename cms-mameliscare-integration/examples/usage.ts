// Run on the server. Set CMS_ACCESS_TOKEN in your server environment.
import { createCmsClient } from "../client";
import { isExpandedEntry, modelSlugById } from "../types";

const cms = createCmsClient({
  origin: process.env.CMS_URL ?? "https://cms.fourd.nl",
  tenantSlug: process.env.CMS_TENANT_SLUG ?? "mameliscare",
  token: process.env.CMS_ACCESS_TOKEN ?? "",
});

export async function loadExample(entryId: string, assetId?: string) {
  const models = await cms.listModels();
  const modelSlug = "menu";
  if (!modelSlug) return { models, entries: [] };
  const model = await cms.getModel(modelSlug);
  const page = await cms.listEntries(modelSlug, { limit: 20, maxDepth: 2 });
  // locale selects translations; untranslated fields return the default-language value.
  const detail = await cms.getEntry(modelSlug, entryId, { maxDepth: 2, locale: "en" });
  for await (const entry of cms.iterateEntries(modelSlug, { limit: 20, maxDepth: 2 })) {
    // Validate fields before rendering. Do not assume every model has a title field.
    for (const field of model.data.fields) {
      const value = entry.data[field.key];
      if (field.type === "component") {
        for (const component of Array.isArray(value) ? value : [value]) {
          if (isExpandedEntry(component)) {
            const rendererName = modelSlugById[component.modelId];
            // Dispatch to your renderer by rendererName, passing component.data.
            void rendererName;
          }
          // Null: omit or show a placeholder. Compact reference: fetch separately or show fallback.
        }
      }
    }
  }
  // Asset IDs are stable; their URLs expire after 300 seconds. Resolve a fresh URL when serving the file.
  const asset = assetId ? await cms.getAsset(assetId) : null;
  return { models, model, page, detail, asset };
}
