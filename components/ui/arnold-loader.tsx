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
        filter:
          "drop-shadow(0.5px 0 0 white) drop-shadow(-0.5px 0 0 white) drop-shadow(0 0.5px 0 white) drop-shadow(0 -0.5px 0 white)",
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