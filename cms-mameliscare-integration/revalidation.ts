// Server-only. Answers the CMS revalidation request (openapi.json webhooks.revalidate).
// Needs only the Fetch API and Web Crypto: Node 18+, edge runtimes, Bun and Deno.

export type RevalidationOptions = {
  /** The secret saved for this tenant in CMS Settings → Revalidation, e.g. process.env.CMS_REVALIDATION_SECRET. */
  secret: string | undefined;
  /** Mark everything derived from CMS content stale. Keep it quick: the CMS waits at most 15 seconds. */
  invalidate: () => void | Promise<void>;
};

export async function handleRevalidation(request: Request, options: RevalidationOptions): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { ...headers, Allow: "POST" } });
  if (!options.secret) return Response.json({ error: "Revalidation is not configured" }, { status: 503, headers });
  if (!(await constantTimeEqual(request.headers.get("authorization") ?? "", "Bearer " + options.secret))) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { ...headers, "WWW-Authenticate": "Bearer" } });
  }
  try {
    await options.invalidate();
  } catch (error) {
    console.error("CMS revalidation failed", error);
    return Response.json({ error: "Revalidation failed" }, { status: 500, headers });
  }
  return Response.json({ revalidated: true }, { headers });
}

// Compares SHA-256 digests so timing reveals neither the length nor the content of the secret.
async function constantTimeEqual(supplied: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([supplied, expected].map((value) => crypto.subtle.digest("SHA-256", encoder.encode(value))));
  const left = new Uint8Array(a!);
  const right = new Uint8Array(b!);
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}
