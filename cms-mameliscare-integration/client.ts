// Server-only client. Keep tokens out of browser bundles and public environment variables.
import type { DeliveryAsset, DeliveryEntry, EntryByModel, Model, ModelDetail } from "./types";

export type PageOptions = {
  limit?: number; cursor?: string; maxDepth?: number; locale?: string; signal?: AbortSignal;
  /** Only entries with this slug; slugField picks the field when a model has several slug fields. */
  slug?: string; slugField?: string;
};
export type CmsPage<T> = { data: T[]; meta: { nextCursor: string | null; maxDepth: number; locale?: string } };
type EntryFor<M extends string> = M extends keyof EntryByModel ? EntryByModel[M] : DeliveryEntry;
export class CmsApiError extends Error {
  constructor(public status: number, public code: string, message: string, public requestId: string | null) {
    super(message); this.name = "CmsApiError";
  }
}
export type CmsClientConfig = {
  origin: string; tenantSlug: string; token: string; fetch?: typeof fetch;
  /** Applied when a call passes no signal of its own. Defaults to 15000. */
  timeoutMs?: number;
};
export function createCmsClient(config: CmsClientConfig) {
  if (typeof window !== "undefined") throw new Error("The CMS client must run on a trusted server");
  const origin = new URL(config.origin);
  if (!/^https?:$/.test(origin.protocol) || origin.username || origin.password) throw new Error("CMS origin must be an HTTP(S) URL without credentials");
  if (!config.token || !config.tenantSlug) throw new Error("CMS token and tenant slug are required");
  const tenantBase = "/api/content/" + encodeURIComponent(config.tenantSlug);
  const base = tenantBase + "/models";
  const timeoutMs = config.timeoutMs ?? 15000;
  const fetcher = config.fetch ?? fetch;
  const modelPath = (slug: string) => base + "/" + encodeURIComponent(slug);
  function bounded(value: number | undefined, max: number, name: string) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > max)) throw new Error(name + " must be an integer from 1 to " + max);
  }
  async function request(path: string, query: Record<string, string | number | undefined> = {}, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const url = new URL(path, origin.origin);
    for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, String(value));
    const response = await fetcher(url, { headers: { Authorization: "Bearer " + config.token }, cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(timeoutMs) });
    let body: unknown;
    try { body = await response.json(); } catch {
      throw new CmsApiError(response.status, "INVALID_RESPONSE", "CMS returned non-JSON content", response.headers.get("x-request-id"));
    }
    const record = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
    if (!response.ok) {
      const error = record.error && typeof record.error === "object" ? record.error as Record<string, unknown> : {};
      throw new CmsApiError(response.status, typeof error.code === "string" ? error.code : "HTTP_ERROR", typeof error.message === "string" ? error.message : "CMS request failed", response.headers.get("x-request-id") ?? (typeof error.requestId === "string" ? error.requestId : null));
    }
    if (!("data" in record)) throw new CmsApiError(response.status, "INVALID_RESPONSE", "CMS response is missing data", response.headers.get("x-request-id"));
    return record;
  }
  function meta(body: Record<string, unknown>, paginated: boolean) {
    const value = body.meta;
    if (!value || typeof value !== "object" || !("maxDepth" in value) || typeof value.maxDepth !== "number" || !Number.isInteger(value.maxDepth) || value.maxDepth < 1 || value.maxDepth > 5
      || (paginated && (!("nextCursor" in value) || (value.nextCursor !== null && (typeof value.nextCursor !== "string" || !value.nextCursor))))) {
      throw new CmsApiError(200, "INVALID_RESPONSE", "CMS pagination metadata is invalid", null);
    }
  }
  async function listEntries<M extends string>(model: M, options: PageOptions = {}): Promise<CmsPage<EntryFor<M>>> {
    bounded(options.limit, 100, "limit"); bounded(options.maxDepth, 5, "maxDepth");
    const body = await request(modelPath(model) + "/entries", { limit: options.limit, cursor: options.cursor, maxDepth: options.maxDepth, locale: options.locale, slug: options.slug, slugField: options.slugField }, options.signal);
    if (!Array.isArray(body.data)) throw new CmsApiError(200, "INVALID_RESPONSE", "CMS entries must be an array", null);
    meta(body, true);
    return body as unknown as CmsPage<EntryFor<M>>;
  }
  return {
    async listModels(signal?: AbortSignal): Promise<{ data: Model[]; meta?: { defaultLocale: string; locales: string[] } }> {
      const body = await request(base, {}, signal);
      if (!Array.isArray(body.data)) throw new CmsApiError(200, "INVALID_RESPONSE", "CMS models must be an array", null);
      return body as { data: Model[]; meta?: { defaultLocale: string; locales: string[] } };
    },
    async getModel(model: string, signal?: AbortSignal): Promise<{ data: ModelDetail }> {
      const body = await request(modelPath(model), {}, signal);
      if (!body.data || typeof body.data !== "object" || !("fields" in body.data) || !Array.isArray(body.data.fields)) throw new CmsApiError(200, "INVALID_RESPONSE", "CMS model is invalid", null);
      return body as { data: ModelDetail };
    },
    listEntries,
    async getEntry<M extends string>(model: M, id: string, options: Pick<PageOptions, "maxDepth" | "locale" | "signal"> = {}): Promise<{ data: EntryFor<M>; meta: { maxDepth: number; locale?: string } }> {
      bounded(options.maxDepth, 5, "maxDepth");
      const body = await request(modelPath(model) + "/entries/" + encodeURIComponent(id), { maxDepth: options.maxDepth, locale: options.locale }, options.signal);
      if (!body.data || typeof body.data !== "object" || !("data" in body.data)) throw new CmsApiError(200, "INVALID_RESPONSE", "CMS entry is invalid", null);
      meta(body, false);
      return body as unknown as { data: EntryFor<M>; meta: { maxDepth: number; locale?: string } };
    },
    /** The newest published entry with this slug (in options.locale), or null. */
    async findEntryBySlug<M extends string>(model: M, slug: string, options: Pick<PageOptions, "maxDepth" | "locale" | "slugField" | "signal"> = {}): Promise<EntryFor<M> | null> {
      const page = await listEntries(model, { ...options, slug, limit: 1 });
      return page.data[0] ?? null;
    },
    /** A fresh url for a stored asset ID. URLs expire after 300 seconds; never persist them. */
    async getAsset(id: string, signal?: AbortSignal): Promise<{ data: DeliveryAsset }> {
      const body = await request(tenantBase + "/assets/" + encodeURIComponent(id), {}, signal);
      if (!body.data || typeof body.data !== "object" || !("url" in body.data) || typeof body.data.url !== "string") throw new CmsApiError(200, "INVALID_RESPONSE", "CMS asset is invalid", null);
      return body as { data: DeliveryAsset };
    },
    async *iterateEntries<M extends string>(model: M, options: Omit<PageOptions, "cursor"> = {}): AsyncGenerator<EntryFor<M>> {
      let cursor: string | undefined;
      const seen = new Set<string>();
      do {
        const page = await listEntries(model, { ...options, cursor });
        yield* page.data;
        cursor = page.meta.nextCursor ?? undefined;
        if (cursor && seen.has(cursor)) throw new CmsApiError(200, "INVALID_RESPONSE", "CMS repeated a pagination cursor", null);
        if (cursor) seen.add(cursor);
      } while (cursor);
    },
  };
}
