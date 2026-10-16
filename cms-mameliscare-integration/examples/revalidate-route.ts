// app/api/revalidate/route.ts in a Next.js App Router project.
// Other frameworks: pass the incoming Request to handleRevalidation and clear your caches in invalidate().
import { revalidatePath, revalidateTag } from "next/cache";
import { handleRevalidation } from "../revalidation";

export function POST(request: Request) {
  return handleRevalidation(request, {
    secret: process.env.CMS_REVALIDATION_SECRET,
    invalidate: () => {
      // Tag cached CMS reads with "cms" (cacheTag, or fetch's next.tags) so one call marks them all stale.
      // { expire: 0 } makes the next visit fetch fresh content, so an editor who just clicked Revalidate sees the change.
      // "max" would serve one more stale response while refreshing in the background.
      revalidateTag("cms", { expire: 0 });
      revalidatePath("/", "layout");
    },
  });
}
