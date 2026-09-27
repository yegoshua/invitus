"use client";

import { ChartLine, LayoutDashboard, Package, Receipt, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@site/lib/utils";

const ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Огляд", icon: LayoutDashboard },
  { href: "/orders", label: "Замовлення", icon: Receipt },
  { href: "/products", label: "Товари", icon: Package },
  { href: "/traffic", label: "Трафік", icon: ChartLine },
  { href: "/expenses", label: "Витрати", icon: Wallet },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

export function SidebarNav() {
  const isActive = useIsActive();
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            isActive(href) && "bg-secondary text-foreground"
          )}
        >
          <Icon className={cn("size-5", isActive(href) && "text-primary")} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function TabBar() {
  const isActive = useIsActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground",
            isActive(href) && "text-foreground"
          )}
        >
          <Icon className={cn("size-5", isActive(href) && "text-primary")} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
