import { revalidateTag } from "next/cache";
import { handleRevalidation } from "@/lib/cms/revalidation";
export async function POST(request: Request) {
  return handleRevalidation(request, {
    secret: process.env.CMS_REVALIDATION_SECRET,
    invalidate: () => revalidateTag("cms", { expire: 0 }),
  });
}
