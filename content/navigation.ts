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

export const socialLinks: NavLink[] = [
  { href: "https://www.instagram.com/invitus.ua", label: "Instagram" },
  { href: "https://www.tiktok.com/@invitus.ua", label: "TikTok" },
];