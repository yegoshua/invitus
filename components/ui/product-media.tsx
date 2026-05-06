import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";

// Single owner of "render a product image with consistent fallback".
//
// Two fallback strategies:
//   - fallbackSrc: use a static URL (e.g. hero background placeholder)
//   - default: render centered "INVITUS" brand text on whatever background
//     the parent provides
//
// Caller owns the relative-positioned container (next/image with `fill` requires it).

type ProductMediaProps = Omit<ImageProps, "src" | "alt"> & {
  image?: ProductImage;
  alt?: string;
  fallbackSrc?: string;
  fallbackBrandTextClassName?: string;
};

const DEFAULT_BRAND_TEXT = "text-[clamp(1.5rem,3vw,2.5rem)] text-neutral-800";

export function ProductMedia({
  image,
  alt,
  fallbackSrc,
  fallbackBrandTextClassName,
  className,
  ...imageProps
}: ProductMediaProps) {
  if (image) {
    return (
      <Image
        src={image.url}
        alt={alt ?? image.alt}
        className={className}
        {...imageProps}
      />
    );
  }

  if (fallbackSrc) {
    return (
      <Image
        src={fallbackSrc}
        alt={alt ?? ""}
        className={className}
        {...imageProps}
      />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span
        className={cn(
          "font-heading select-none",
          fallbackBrandTextClassName ?? DEFAULT_BRAND_TEXT
        )}
      >
        INVITUS
      </span>
    </div>
  );
}
