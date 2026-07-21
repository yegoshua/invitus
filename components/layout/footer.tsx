import Link from "next/link";
import VisaIcon from "@/public/assets/icons/visa-icon.svg";
import MasterCardIcon from "@/public/assets/icons/master-card-icon.svg";

const categoryLinks = [
  { href: "/shop/belts", label: "Атлетичні пояси" },
  { href: "/shop/wrist-wraps", label: "Кистьові бинти" },
  { href: "/shop/straps", label: "Лямки-вісімки" },
  { href: "/shop/knee-sleeves", label: "Наколінники" },
];

const socialLinks = [
  { href: "https://instagram.com/invitus.ua", label: "Instagram" },
  { href: "https://tiktok.com/@invitus.ua", label: "TikTok" },
];

const legalLinks = [
  {
    href: "https://docs.google.com/document/d/1KNl7zuE12oEiTT0ixwsnEaAKWl8ompZjwb7LAuuDPCA/edit?usp=sharing",
    label: "Публічна оферта",
  },
  { href: "/refund", label: "Повернення товару" },
];

export function Footer() {
  return (
    <footer className="bg-black text-white pt-12 lg:pt-16 pb-0">
      <div className="container-main">
        {/* Row 1: category + social links */}
        <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-0 mb-8 lg:mb-10">
          {/* Category Links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-3 lg:gap-10 max-w-[280px] lg:max-w-none">
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

        {/* Row 2: legal entity + legal links | payment methods */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-0 mb-16 lg:mb-24">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-6 lg:gap-10 text-white">
            <span>ФОП Григорян Сергій Валерійович</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2 lg:gap-10">
              {legalLinks.map((link) =>
                link.href.startsWith("http") ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-coral transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="hover:text-coral transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Payment methods */}
          <div className="flex items-center gap-10">
            <VisaIcon className="h-10 w-auto" />
            <MasterCardIcon className="h-10 w-auto" />
          </div>
        </div>
      </div>

      {/* Large Logo */}
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
