import Link from "next/link";

const categoryLinks = [
  { href: "/shop/belts", label: "Атлетичні пояси" },
  { href: "/shop/shirts", label: "Футболки" },
  { href: "/shop/wrist-wraps", label: "Кистьові бинти" },
  { href: "/shop/straps", label: "Лямки-вісімки" },
  { href: "/shop/knee-sleeves", label: "Наколінники" },
];

const socialLinks = [
  { href: "https://instagram.com/invitus.ua", label: "Instagram" },
  { href: "https://t.me/invitus_ua", label: "Telegram" },
  { href: "https://tiktok.com/@invitus.ua", label: "TikTok" },
];

export function Footer() {
  return (
    <footer className="bg-black text-white pt-12 lg:pt-16 pb-0">
      <div className="container-main">
        {/* Links Row */}
        <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-0 mb-20 lg:mb-24">
          {/* Category Links */}
          <nav className="flex flex-wrap gap-6 lg:gap-10">
            {categoryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white hover:text-coral transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Social Links */}
          <nav className="flex gap-6 lg:gap-10">
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-coral transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Large Logo */}
      </div>
       <div className="w-full">
          <svg
            viewBox="0 0 100 18"
            className="w-full block"
            aria-label="INVITUS"
            preserveAspectRatio="xMidYMid meet"
          >
            <text
              x="0"
              y="16"
              fontFamily="var(--font-druk)"
              fontWeight="900"
              fontSize="20"
              fill="white"
              textLength="100"
              lengthAdjust="spacingAndGlyphs"
            >
              INVITUS
            </text>
          </svg>
        </div>
    </footer>
  );
}
