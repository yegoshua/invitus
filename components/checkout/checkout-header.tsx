"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Stripped-down header for the checkout flow: brand logo only.
 * Same fixed-top + scroll-condense behavior as the main header,
 * but no navigation links and no cart trigger to keep focus on the form.
 */
export function CheckoutHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-[#0A0A0A]/48 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      )}
    >
      <div className="container-main">
        <div className="flex items-center h-16 lg:h-20">
          <Link href="/" className="shrink-0 pl-2 lg:pl-0">
            <span className="font-heading text-xl lg:text-2xl font-bold text-white tracking-wider">
              INVITUS
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
