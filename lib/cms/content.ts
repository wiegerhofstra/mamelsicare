export type ContentNode = {
  type: string;
  text?: string;
  attrs: Record<string, unknown>;
  marks: { type: string; attrs: Record<string, unknown> }[];
  content: ContentNode[];
};

export type CmsImage = { id: string; width: number; height: number };
export type Page = {
  id: string;
  slug: string;
  title: string;
  content: ContentNode[];
  image: CmsImage | null;
};
export type NavItem = { title: string; href: string };

export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isAssetId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function safeHref(value: unknown): string | null {
  const href = text(value);
  if (!href || /[\s\u0000-\u001f\u007f\\]/u.test(href)) return null;
  if (/^(\/(?!\/)|#|\?)/.test(href)) return href;
  try {
    return ["https:", "http:", "mailto:", "tel:"].includes(
      new URL(href).protocol,
    )
      ? href
      : null;
  } catch {
    return null;
  }
}

export function normalizeImage(value: unknown): CmsImage | null {
  const asset = record(value);
  if (!isAssetId(asset.id) || !text(asset.mimeType).startsWith("image/"))
    return null;
  const dimension = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 30000
      ? v
      : fallback;
  return {
    id: asset.id,
    width: dimension(asset.imageWidth, 1600),
    height: dimension(asset.imageHeight, 900),
  };
}

// Keep only supported attributes. In particular, signed asset URLs never enter the cache.
export function normalizeRichText(value: unknown): ContentNode[] {
  let remaining = 2000;
  function visit(value: unknown, depth: number): ContentNode | null {
    if (depth > 40 || --remaining < 0) return null;
    const raw = record(value);
    if (!text(raw.type)) return null;
    const attrs = record(raw.attrs);
    const asset = record(attrs.asset);
    const clean: Record<string, unknown> = {};
    for (const key of ["level", "start", "colspan", "rowspan"]) {
      if (typeof attrs[key] === "number" && Number.isInteger(attrs[key]))
        clean[key] = attrs[key];
    }
    if (isAssetId(asset.id)) {
      clean.asset = {
        id: asset.id,
        mimeType: text(asset.mimeType),
        originalName: text(asset.originalName),
        image: normalizeImage(asset),
      };
    }
    return {
      type: text(raw.type),
      text: typeof raw.text === "string" ? raw.text : undefined,
      attrs: clean,
      marks: Array.isArray(raw.marks)
        ? raw.marks.slice(0, 20).map((mark) => {
            const m = record(mark);
            return {
              type: text(m.type),
              attrs: { href: safeHref(record(m.attrs).href) },
            };
          })
        : [],
      content: Array.isArray(raw.content)
        ? raw.content.slice(0, 2000).flatMap((child) => {
            const node = visit(child, depth + 1);
            return node ? [node] : [];
          })
        : [],
    };
  }
  const root = visit(value, 0);
  return root ? (root.type === "doc" ? root.content : [root]) : [];
}

export function normalizePage(value: unknown): Page | null {
  const entry = record(value);
  const data = record(entry.data);
  const slug = text(data.slug);
  const title = text(data.title);
  if (!text(entry.id) || !title || !/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(slug))
    return null;
  return {
    id: text(entry.id),
    title,
    slug,
    content: normalizeRichText(data.content),
    image: normalizeImage(data.cover_image),
  };
}

export function plainText(nodes: ContentNode[]): string {
  return nodes
    .map((node) => node.text ?? plainText(node.content))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function pageHref(slug: string): string {
  return slug === "home" ? "/" : `/${encodeURIComponent(slug)}`;
}

export function faqSections(nodes: ContentNode[]) {
  const introduction: ContentNode[] = [];
  const questions: { question: string; answer: ContentNode[] }[] = [];
  const remainder: ContentNode[] = [];
  let ended = false;
  for (const node of nodes) {
    const label = plainText([node]);
    if (label === "Overige informatie") ended = true;
    if (ended) {
      remainder.push(node);
      continue;
    }
    if (
      (node.type === "paragraph" || node.type === "heading") &&
      label.endsWith("?")
    ) {
      questions.push({ question: label, answer: [] });
    } else if (questions.length) questions.at(-1)!.answer.push(node);
    else introduction.push(node);
  }
  return { introduction, questions, remainder };
}
