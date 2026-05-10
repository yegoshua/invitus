"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useCartCount, useOpenCart } from "@/hooks/use-cart";
import { useMenuStore } from "@/stores/menu";
import { cn } from "@/lib/utils";
import { navLinks } from "@/content/navigation";
import MenuIcon from "@/public/assets/icons/menu-icon.svg";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const itemCount = useCartCount();
  const openCart = useOpenCart();
  const openMenu = useMenuStore((state) => state.openMenu);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isProductPage = pathname.startsWith("/product/");

  return (
    <header
      className={cn(
        "fixed left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "top-0 bg-[#0A0A0A]/48 backdrop-blur-md shadow-lg"
          : cn(
              "bg-transparent",
              isProductPage ? "top-0 lg:top-6" : "top-0 lg:top-6"
            )
      )}
    >
      <div className="container-main">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="shrink-0 pl-2 lg:pl-0">
            <span className="font-heading text-xl lg:text-2xl font-bold text-white tracking-wider">
              INVITUS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-base leading-6 text-white transition-all",
                    isActive ? "font-bold" : "font-medium hover:font-semibold"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: Cart + Mobile menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={openCart}
              className="p-2 text-white text-base leading-6 font-medium cursor-pointer"
            >
              Кошик ({isMounted ? itemCount : 0})
            </button>

            <button
              className="lg:hidden p-2 text-white cursor-pointer"
              onClick={openMenu}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}