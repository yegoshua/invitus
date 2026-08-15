// Top-nav links shown in Header.

export interface NavLink {
  href: string;
  label: string;
}

export const navLinks: NavLink[] = [
  { href: "/shop/belts", label: "Атлетичні пояси" },
  { href: "/shop/wrist-wraps", label: "Кистьові бинти" },
  { href: "/shop/straps", label: "Лямки-вісімки" },
  { href: "/shop/knee-sleeves", label: "Наколінники" },
];

/**
 * Kept out of `navLinks` on purpose: that array is the product categories, and
 * the mobile drawer renders it under a "Продукти" heading. The blog is not a
 * product, so it is a link of its own that each surface places for itself.
 */
export const blogLink: NavLink = { href: "/blog", label: "Блог" };

export const socialLinks: NavLink[] = [
  { href: "https://www.instagram.com/invitus.ua", label: "Instagram" },
  { href: "https://www.tiktok.com/@invitus.ua", label: "TikTok" },
];