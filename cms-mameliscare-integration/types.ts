// Generated from the selected tenant. Regenerate after model changes.
// Raw fields use unknown because delivery does not validate their stored JSON.
export type EntryReference = { id: string; modelId: string };
export type DeliveryEntry<T = Record<string, unknown>> = EntryReference & {
  status: "published"; data: T; publishedAt: string | null; createdAt: string; updatedAt: string;
};
export type DeliveryAsset = {
  id: string; originalName: string; mimeType: string; sizeBytes: number;
  imageWidth: number | null; imageHeight: number | null; url: string;
};
export type RichTextNode = {
  type: string; text?: string; content?: RichTextNode[];
  attrs?: Record<string, unknown> & { assetId?: string; asset?: DeliveryAsset | null };
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};
export type Model = { id: string; name: string; slug: string; status: "active" | "archived"; createdAt: string; updatedAt: string };
export type Field = {
  id: string; key: string; label: string; type: "text" | "rich_text" | "url" | "number" | "boolean" | "date" | "time" | "enum" | "asset" | "component" | "slug";
  required: boolean; position: number; config: Record<string, unknown>; isList: boolean; isTitle: boolean; localized: boolean; targetModelIds: string[];
};
export type ModelDetail = Model & { fields: Field[] };
export type EntryByModel = {
  "menu": DeliveryEntry<{
    "internal_name"?: unknown;
    "items"?: Array<EntryReference | EntryByModel["page"]>;
    [key: string]: unknown;
  }> & { modelId: "1ae7796c-ac8d-4360-b643-acd145388be7" };
  "page": DeliveryEntry<{
    "title"?: unknown;
    "slug"?: unknown;
    "content"?: unknown;
    "cover_image"?: DeliveryAsset | null;
    [key: string]: unknown;
  }> & { modelId: "bf45584e-7868-4b02-b431-9d2f3604d6c1" };
};
// Editor intent only: validate/normalize raw values before treating them as these types.
export type ExpectedDataByModel = {
  "menu": {
    "internal_name"?: string | null;
    "items"?: Array<EntryReference | EntryByModel["page"]>;
  };
  "page": {
    "title"?: string | null;
    "slug"?: string | null;
    "content"?: RichTextNode | null;
    "cover_image"?: DeliveryAsset | null;
  };
};
export const modelSlugById: Record<string, string> = {
  "1ae7796c-ac8d-4360-b643-acd145388be7": "menu",
  "bf45584e-7868-4b02-b431-9d2f3604d6c1": "page"
};
export function isExpandedEntry(value: unknown): value is DeliveryEntry {
  return !!value && typeof value === "object" && "id" in value && typeof value.id === "string"
    && "modelId" in value && typeof value.modelId === "string" && "status" in value && value.status === "published"
    && "data" in value && !!value.data && typeof value.data === "object" && !Array.isArray(value.data);
}
