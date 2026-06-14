import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowUpRight, Loader2, XCircle } from "lucide-react";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { ClearCartOnMount } from "@/components/checkout/clear-cart-on-mount";
import { ConfettiOverlay } from "@/components/checkout/confetti-overlay";
import { getInvoiceStatus } from "@/lib/monobank";
import SuccessCheckoutIcon from "@/public/assets/icons/checkout/sucess-checkout.svg";

export const metadata: Metadata = {
  title: "Результат оплати | INVITUS",
};

// Status query must hit Monobank fresh every visit — never cache.
export const dynamic = "force-dynamic";

const socialLinks = [
  { href: "https://instagram.com/invitus.ua", label: "Instagram" },
  { href: "https://t.me/invitus_ua", label: "Telegram" },
  { href: "https://tiktok.com/@invitus.ua", label: "TikTok" },
];

interface PageProps {
  searchParams: Promise<{ invoiceId?: string }>;
}

export default async function PaymentResultPage({ searchParams }: PageProps) {
  const { invoiceId: queryInvoiceId } = await searchParams;

  const cookieStore = await cookies();
  const invoiceId =
    queryInvoiceId ||
    cookieStore.get("invitus_last_invoice_id")?.value ||
    null;

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <CheckoutHeader />
      {invoiceId ? (
        <PaymentResult invoiceId={invoiceId} />
      ) : (
        <ResultLayout>
          <ErrorCard
            title="Не вдалося визначити платіж"
            description="У посиланні немає invoiceId. Якщо ти щойно сплатив — перевір лист від банку або повернись у каталог."
          />
        </ResultLayout>
      )}
    </div>
  );
}

async function PaymentResult({ invoiceId }: { invoiceId: string }) {
  let result: Awaited<ReturnType<typeof getInvoiceStatus>> | null = null;
  let error: string | null = null;

  try {
    result = await getInvoiceStatus(invoiceId);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  if (error) {
    return (
      <ResultLayout>
        <ErrorCard
          title="Не вдалося перевірити статус"
          description={error}
        />
      </ResultLayout>
    );
  }

  if (!result) return null;

  if (result.status === "success") {
    return (
      <ResultLayout>
        <ClearCartOnMount />
        <ConfettiOverlay />
        <SuccessCard />
      </ResultLayout>
    );
  }

  if (
    result.status === "processing" ||
    result.status === "created" ||
    result.status === "hold"
  ) {
    return (
      <ResultLayout>
        <PendingCard />
      </ResultLayout>
    );
  }

  // failure / reversed / expired
  return (
    <ResultLayout>
      <ErrorCard
        title="Оплата не пройшла"
        description={
          result.failureReason ||
          (result.status === "expired"
            ? "Час дії посилання сплив — спробуй створити нове замовлення."
            : result.status === "reversed"
              ? "Платіж скасовано — кошти повернуто на картку."
              : "Спробуй ще раз або обери оплату при отриманні.")
        }
        ctaHref="/checkout"
        ctaLabel="Спробувати ще раз"
      />
    </ResultLayout>
  );
}

function ResultLayout({ children }: { children: React.ReactNode }) {
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

function SuccessCard() {
  return (
    <div className="w-full bg-surface rounded-[32px] p-8 sm:p-10 lg:p-14 text-center">
      <SuccessCheckoutIcon className="mx-auto mb-6 lg:mb-8 w-16 h-16 lg:w-[72px] lg:h-[72px]" />

      <h1 className="font-heading font-bold text-white text-2xl leading-8 lg:text-[32px] lg:leading-10 tracking-[0.02em] uppercase mb-4">
        Екіп вже в дорозі!
      </h1>

      <p className="font-sans font-medium text-white/78 text-sm leading-5 lg:text-base lg:leading-6 tracking-[0.01em] mb-8 lg:mb-10 max-w-[460px] mx-auto">
        Дякуємо! Твоє екіпірування вже їде. Лишилось познайомити його із залом.
      </p>

      <Link
        href="/"
        className="group inline-flex items-center justify-center gap-3 lg:gap-4 w-full lg:max-w-[544px] mx-auto h-16 lg:h-[88px] pt-[22px] pr-7 pb-[22px] pl-8 lg:pt-8 lg:pr-10 lg:pb-8 lg:pl-12 rounded-3xl lg:rounded-[32px] bg-coral text-black font-heading font-bold tracking-[0.05em] uppercase text-base lg:text-lg transition-[filter] duration-150 hover:brightness-110"
      >
        На головну
        <ArrowUpRight className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.4} />
      </Link>

      <p className="mt-6 lg:mt-8 font-sans font-medium text-[14px] leading-5 tracking-[0.01em] text-[#FFFFFFA3]">
        Щось пішло не так із замовленням? Напиши нам у{" "}
        <a
          href="https://instagram.com/invitus.ua"
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

function PendingCard() {
  return (
    <div className="w-full bg-surface rounded-[32px] p-8 sm:p-10 lg:p-14 text-center">
      <div className="mx-auto w-16 h-16 lg:w-[72px] lg:h-[72px] rounded-full bg-coral/15 flex items-center justify-center mb-6 lg:mb-8">
        <Loader2 className="w-8 h-8 lg:w-9 lg:h-9 text-coral animate-spin" strokeWidth={1.8} />
      </div>
      <h1 className="font-heading text-h3 lg:text-h2 text-white mb-4 uppercase">
        Обробляємо платіж
      </h1>
      <p className="text-white/78 text-base lg:text-lg mb-8 lg:mb-10 max-w-[460px] mx-auto">
        Банк ще не підтвердив транзакцію. Онови сторінку за хвилину або очікуй
        email-підтвердження.
      </p>
      <Link
        href="/"
        className="group inline-flex items-center justify-center gap-3 w-full h-14 lg:h-16 rounded-[40px] bg-coral text-black font-heading font-bold tracking-[0.05em] uppercase text-base lg:text-lg transition-[filter] duration-150 hover:brightness-110"
      >
        На головну
        <ArrowUpRight className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.4} />
      </Link>
    </div>
  );
}

function ErrorCard({
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
        <XCircle className="w-8 h-8 lg:w-9 lg:h-9 text-[var(--color-error)]" strokeWidth={1.8} />
      </div>
      <h1 className="font-heading text-h3 lg:text-h2 text-white mb-4 uppercase">
        {title}
      </h1>
      <p className="text-white/78 text-base lg:text-lg mb-8 lg:mb-10 max-w-[460px] mx-auto break-words">
        {description}
      </p>
      <Link
        href={ctaHref}
        className="group inline-flex items-center justify-center gap-3 w-full h-14 lg:h-16 rounded-[40px] bg-coral text-black font-heading font-bold tracking-[0.05em] uppercase text-base lg:text-lg transition-[filter] duration-150 hover:brightness-110"
      >
        {ctaLabel}
        <ArrowUpRight className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.4} />
      </Link>
    </div>
  );
}
