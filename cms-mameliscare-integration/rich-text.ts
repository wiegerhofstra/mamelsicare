// Renders CMS rich text (Tiptap JSON) to safe HTML. All text and attribute values are escaped, links are limited to
// safe protocols, and unknown nodes render only their children, so new editor features degrade gracefully.
import type { DeliveryAsset, RichTextNode } from "./types";

export type RichTextOptions = {
  /** Where an asset is served, e.g. (asset) => "/media/" + asset.id. Defaults to asset.url, which expires after 300 seconds. Return null to omit the asset. */
  assetUrl?: (asset: DeliveryAsset) => string | null;
  /** Alternative text for images. The CMS stores no alt text, so the default is "" (decorative). */
  assetAlt?: (asset: DeliveryAsset) => string;
};

const maxDepth = 100;
const markTags: Record<string, string> = { bold: "strong", italic: "em", strike: "s", underline: "u", code: "code", subscript: "sub", superscript: "sup" };
const blockTags: Record<string, string> = { paragraph: "p", blockquote: "blockquote", bulletList: "ul", listItem: "li", tableRow: "tr" };
const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function renderRichText(document: unknown, options: RichTextOptions = {}): string {
  return renderNode(document, options, 0);
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

/** The href if it is http(s), mailto, tel, a relative path or a fragment; otherwise null. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (!href || [...href].some((char) => char.charCodeAt(0) <= 32)) return null;
  if ((href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#") || href.startsWith("?")) return href;
  try {
    return ["http:", "https:", "mailto:", "tel:"].includes(new URL(href).protocol) ? href : null;
  } catch {
    return null;
  }
}

function renderNode(value: unknown, options: RichTextOptions, depth: number): string {
  if (depth > maxDepth || !value || typeof value !== "object" || Array.isArray(value)) return "";
  const node = value as RichTextNode;
  const attrs: Record<string, unknown> = node.attrs ?? {};
  const children = () => (Array.isArray(node.content) ? node.content.map((child) => renderNode(child, options, depth + 1)).join("") : "");
  switch (node.type) {
    case "doc": return children();
    case "text": return renderText(node);
    case "heading": {
      const tag = "h" + integer(attrs.level, 1, 6, 2);
      return "<" + tag + ">" + children() + "</" + tag + ">";
    }
    case "orderedList": {
      const start = integer(attrs.start, 0, 1000000, 1);
      return (start === 1 ? "<ol>" : '<ol start="' + start + '">') + children() + "</ol>";
    }
    case "codeBlock": {
      const language = typeof attrs.language === "string" && /^[A-Za-z0-9_+-]{1,40}$/.test(attrs.language) ? ' class="language-' + attrs.language + '"' : "";
      return "<pre><code" + language + ">" + escapeHtml(plainText(node, 0)) + "</code></pre>";
    }
    case "hardBreak": return "<br>";
    case "horizontalRule": return "<hr>";
    case "table": return "<table><tbody>" + children() + "</tbody></table>";
    case "tableCell":
    case "tableHeader": {
      const tag = node.type === "tableHeader" ? "th" : "td";
      const spans = ["colspan", "rowspan"].map((name) => {
        const span = integer(attrs[name], 1, 1000, 1);
        return span > 1 ? " " + name + '="' + span + '"' : "";
      }).join("");
      return "<" + tag + spans + ">" + children() + "</" + tag + ">";
    }
    case "asset": return renderAsset(attrs.asset, options);
    default: {
      const tag = blockTags[node.type];
      return tag ? "<" + tag + ">" + children() + "</" + tag + ">" : children();
    }
  }
}

function renderText(node: RichTextNode): string {
  let html = escapeHtml(typeof node.text === "string" ? node.text : "");
  for (const mark of Array.isArray(node.marks) ? node.marks : []) {
    if (mark?.type === "link") {
      const href = safeHref(mark.attrs?.href);
      if (!href) continue;
      const external = /^https?:/i.test(href);
      const target = external && mark.attrs?.target === "_blank" ? ' target="_blank"' : "";
      html = '<a href="' + escapeHtml(href) + '"' + target + (external ? ' rel="noopener noreferrer"' : "") + ">" + html + "</a>";
      continue;
    }
    const tag = typeof mark?.type === "string" ? markTags[mark.type] : undefined;
    if (tag) html = "<" + tag + ">" + html + "</" + tag + ">";
  }
  return html;
}

function renderAsset(value: unknown, options: RichTextOptions): string {
  if (!value || typeof value !== "object" || !("id" in value) || !("url" in value)) return "";
  const asset = value as DeliveryAsset;
  const href = safeHref(options.assetUrl ? options.assetUrl(asset) : asset.url);
  if (!href) return "";
  if (typeof asset.mimeType === "string" && asset.mimeType.startsWith("image/")) {
    const size = (asset.imageWidth ? ' width="' + asset.imageWidth + '"' : "") + (asset.imageHeight ? ' height="' + asset.imageHeight + '"' : "");
    return '<figure><img src="' + escapeHtml(href) + '" alt="' + escapeHtml(options.assetAlt?.(asset) ?? "") + '"' + size + ' loading="lazy"></figure>';
  }
  return '<p><a href="' + escapeHtml(href) + '">' + escapeHtml(String(asset.originalName ?? "Download")) + "</a></p>";
}

function plainText(node: RichTextNode, depth: number): string {
  if (depth > maxDepth) return "";
  if (node.type === "hardBreak") return String.fromCharCode(10);
  if (typeof node.text === "string") return node.text;
  return Array.isArray(node.content) ? node.content.map((child) => plainText(child, depth + 1)).join("") : "";
}

function integer(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}
