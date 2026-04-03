"use client";

import { ParallaxProvider } from "react-scroll-parallax";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { MobileMenuDrawer } from "@/components/layout/mobile-menu-drawer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ParallaxProvider>
      {children}
      <CartDrawer />
      <MobileMenuDrawer />
    </ParallaxProvider>
  );
}
