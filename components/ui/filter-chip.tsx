"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChipButton } from "@/components/ui/chip-button";

interface FilterChipProps {
  slug: string;
  label: string;
  isActive: boolean;
}

export function FilterChip({ slug, label, isActive }: FilterChipProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (slug === "all") {
      params.delete("filter");
    } else {
      params.set("filter", slug);
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  return (
    <ChipButton onClick={handleClick} isActive={isActive}>
      {label}
    </ChipButton>
  );
}
