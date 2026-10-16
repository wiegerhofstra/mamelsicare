import Image from "next/image";
import type { CmsImage as ImageData } from "@/lib/cms/content";

export function CmsImage({
  image,
  alt = "",
  className,
  sizes = "100vw",
  preload = false,
}: {
  image: ImageData;
  alt?: string;
  className?: string;
  sizes?: string;
  preload?: boolean;
}) {
  return (
    <Image
      src={`/media/${image.id}`}
      alt={alt}
      width={image.width}
      height={image.height}
      className={className}
      sizes={sizes}
      preload={preload}
    />
  );
}
