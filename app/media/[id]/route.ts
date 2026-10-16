import { cmsClient } from "@/lib/cms/data";
import { CmsApiError } from "@/lib/cms/client";
import { isAssetId } from "@/lib/cms/content";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/media/[id]">,
) {
  const { id } = await params;
  if (!isAssetId(id)) return new Response("Not found", { status: 404 });
  try {
    const { data: asset } = await cmsClient().getAsset(id);
    const url = new URL(asset.url);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error("Invalid asset URL");
    const upstream = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok || !upstream.body)
      return new Response("Media unavailable", {
        status: upstream.status === 404 ? 404 : 502,
      });
    const inlineImage = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ].includes(asset.mimeType);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": inlineImage
          ? asset.mimeType
          : "application/octet-stream",
        "Content-Disposition": `${inlineImage ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(asset.originalName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    if (error instanceof CmsApiError && error.status === 404)
      return new Response("Not found", { status: 404 });
    console.error(
      "CMS media delivery failed",
      error instanceof CmsApiError
        ? { status: error.status, requestId: error.requestId }
        : { name: error instanceof Error ? error.name : "UnknownError" },
    );
    return new Response("Media unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
