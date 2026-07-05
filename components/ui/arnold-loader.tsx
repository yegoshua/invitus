import Image from "next/image";
import { cn } from "@/lib/utils";

interface ArnoldLoaderProps {
  className?: string;
  size?: number;
}

export function ArnoldLoader({ className, size = 128 }: ArnoldLoaderProps) {
  return (
    <div
      className={cn("relative", className)}
      style={{
        width: size,
        height: size,
        // Integer 1px offsets (not 0.5px): Safari rounds sub-pixel drop-shadow
        // offsets with zero blur down to 0 and skips rendering the outline.
        filter:
          "drop-shadow(1px 0 0 white) drop-shadow(-1px 0 0 white) drop-shadow(0 1px 0 white) drop-shadow(0 -1px 0 white)",
      }}
    >
      <Image
        src="/assets/icons/arnold-loader.webp"
        alt="Завантаження"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}