"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@site/lib/utils";
import { NAV } from "./nav-items";

function useNav() {
  const pathname = usePathname();
  const search = useSearchParams();
  // The period follows you between screens; filters do not.
  const keep = new URLSearchParams();
  for (const key of ["period", "from", "to"]) {
    const v = search.get(key);
    if (v) keep.set(key, v);
  }
  const suffix = keep.size ? `?${keep}` : "";
  return NAV.map((item) => ({
    ...item,
    href: item.href + suffix,
    active: item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  }));
}

/** Desktop: labelled rows. */
export function SidebarNav() {
  return (
    <nav className="flex flex-col gap-1">
      {useNav().map(({ href, label, icon: Icon, active }) => (
        <Link
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground",
            active && "bg-field text-foreground"
          )}
        >
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Tablet: an icon rail with small labels. */
export function RailNav() {
  return (
    <nav className="flex flex-col gap-1.5">
      {useNav().map(({ href, label, icon: Icon, active }) => (
        <Link
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-[60px] w-[68px] flex-col items-center justify-center gap-1 rounded-[14px] text-[11px] font-medium text-muted-foreground hover:text-foreground",
            active && "bg-field text-foreground"
          )}
        >
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Phone: the bottom tab bar. */
export function TabBar() {
  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-border bg-background/95 px-1 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
      {useNav().map(({ href, label, icon: Icon, active }) => (
        <Link
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn("flex h-[52px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-[#737373]", active && "text-foreground")}
        >
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
