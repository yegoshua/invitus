import { Loader2, XCircle } from "lucide-react";
import { CTAButton } from "@/components/ui/cta-button";
import SuccessCheckoutIcon from "@/public/assets/icons/checkout/sucess-checkout.svg";

// The three cards a payment can end on, and the frame they sit in. Shared by
// the acquiring result page (app/payment-result) and the instalment one
// (app/payment-result/parts) so the two outcomes of "you paid" look the same.
// No hooks: the acquiring page is a server component.

const socialLinks = [
  { href: "https://www.instagram.com/invitus.ua", label: "Instagram" },
  { href: "https://www.tiktok.com/@invitus.ua", label: "TikTok" },
];

export function ResultLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container-main relative flex-1 flex flex-col items-center justify-center pt-28 pb-16 lg:pt-32 lg:pb-20">
      <div className="w-full max-w-[640px] flex flex-col items-center gap-10 lg:gap-12">
        {children}
        <nav className="flex items-center gap-6 lg:gap-10">
          {socialLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-coral transition-colors text-sm lg:text-base"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </main>
  );
}

export function SuccessCard({
  description = "Дякуємо! Твоє екіпірування вже їде. Лишилось познайомити його із залом.",
}: {
  description?: string;
}) {
  return (
    <div className="w-full bg-surface rounded-[32px] p-8 sm:p-10 lg:p-14 text-center">
      <SuccessCheckoutIcon className="mx-auto mb-6 lg:mb-8 w-16 h-16 lg:w-[72px] lg:h-[72px]" />

      <h1 className="font-heading font-bold text-white text-2xl leading-8 lg:text-[32px] lg:leading-10 tracking-[0.02em] uppercase mb-4">
        Екіп вже в дорозі!
      </h1>

      <p className="font-sans font-medium text-white/78 text-sm leading-5 lg:text-base lg:leading-6 tracking-[0.01em] mb-8 lg:mb-10 max-w-[460px] mx-auto">
        {description}
      </p>

      <CTAButton href="/" width="fill" className="lg:max-w-[544px] mx-auto">
        На головну
      </CTAButton>

      <p className="mt-6 lg:mt-8 font-sans font-medium text-[14px] leading-5 tracking-[0.01em] text-[#FFFFFFA3]">
        Щось пішло не так із замовленням? Напиши нам у{" "}
        <a
          href="https://www.instagram.com/invitus.ua"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-coral transition-colors underline underline-offset-2"
        >
          Instagram
        </a>{" "}
        — відповідаємо швидко.
      </p>
    </div>
  );
}

export function PendingCard({
  title = "Обробляємо платіж",
  description = "Банк ще не підтвердив транзакцію. Онови сторінку за хвилину або очікуй email-підтвердження.",
  children,
}: {
  title?: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="w-full bg-surface rounded-[32px] p-8 sm:p-10 lg:p-14 text-center">
      <div className="mx-auto w-16 h-16 lg:w-[72px] lg:h-[72px] rounded-full bg-coral/15 flex items-center justify-center mb-6 lg:mb-8">
        <Loader2
          className="w-8 h-8 lg:w-9 lg:h-9 text-coral animate-spin"
          strokeWidth={1.8}
        />
      </div>
      <h1 className="font-heading text-h3 lg:text-h2 text-white mb-4 uppercase">
        {title}
      </h1>
      <p className="text-white/78 text-base lg:text-lg mb-8 lg:mb-10 max-w-[460px] mx-auto">
        {description}
      </p>
      {children ?? (
        <CTAButton href="/" width="fill">
          На головну
        </CTAButton>
      )}
    </div>
  );
}

export function ErrorCard({
  title,
  description,
  ctaHref = "/",
  ctaLabel = "На головну",
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="w-full bg-surface rounded-[32px] p-8 sm:p-10 lg:p-14 text-center">
      <div className="mx-auto w-16 h-16 lg:w-[72px] lg:h-[72px] rounded-full bg-[var(--color-error)]/15 flex items-center justify-center mb-6 lg:mb-8">
        <XCircle
          className="w-8 h-8 lg:w-9 lg:h-9 text-[var(--color-error)]"
          strokeWidth={1.8}
        />
      </div>
      <h1 className="font-heading text-h3 lg:text-h2 text-white mb-4 uppercase">
        {title}
      </h1>
      <p className="text-white/78 text-base lg:text-lg mb-8 lg:mb-10 max-w-[460px] mx-auto break-words">
        {description}
      </p>
      <CTAButton href={ctaHref} width="fill">
        {ctaLabel}
      </CTAButton>
    </div>
  );
}
