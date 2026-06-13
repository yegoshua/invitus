import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { ClearCartOnMount } from "@/components/checkout/clear-cart-on-mount";
import { getInvoiceStatus } from "@/lib/monobank";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Результат оплати | INVITUS",
};

// Status query must hit Monobank fresh every visit — never cache.
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ invoiceId?: string }>;
}

export default async function PaymentResultPage({ searchParams }: PageProps) {
  const { invoiceId: queryInvoiceId } = await searchParams;

  // Monobank redirects without query params, so we fall back to a cookie
  // set by /api/monobank/create-invoice.
  const cookieStore = await cookies();
  const invoiceId =
    queryInvoiceId ||
    cookieStore.get("invitus_last_invoice_id")?.value ||
    null;

  return (
    <div className="bg-black min-h-screen">
      <CheckoutHeader />
      {invoiceId ? (
        <PaymentResult invoiceId={invoiceId} />
      ) : (
        <ResultCard variant="error">
          <h1 className="font-heading text-h3 lg:text-h2 text-white mb-3">
            Не вдалося визначити платіж
          </h1>
          <p className="text-white/78 text-base lg:text-lg mb-8">
            У посиланні немає <code className="text-white/60">invoiceId</code>.
            Якщо ти щойно сплатив — перевір лист від банку або повернись у каталог.
          </p>
          <BackHomeCta />
        </ResultCard>
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
      <ResultCard variant="error">
        <h1 className="font-heading text-h3 lg:text-h2 text-white mb-3">
          Не вдалося перевірити статус
        </h1>
        <p className="text-white/78 text-base mb-8 break-words">{error}</p>
        <BackHomeCta />
      </ResultCard>
    );
  }

  if (!result) return null;

  if (result.status === "success") {
    return (
      <ResultCard variant="success">
        <ClearCartOnMount />
        <h1 className="font-heading text-h3 lg:text-h2 text-white mb-3">
          Оплата успішна
        </h1>
        <p className="text-white/78 text-base lg:text-lg mb-8">
          Дякуємо! Списано {formatPrice(result.amount / 100)} ₴ — формуємо твоє замовлення.
        </p>
        <BackHomeCta />
      </ResultCard>
    );
  }

  if (
    result.status === "processing" ||
    result.status === "created" ||
    result.status === "hold"
  ) {
    return (
      <ResultCard variant="pending">
        <h1 className="font-heading text-h3 lg:text-h2 text-white mb-3">
          Обробляємо платіж
        </h1>
        <p className="text-white/78 text-base lg:text-lg mb-8">
          Банк ще не підтвердив транзакцію. Онови сторінку за хвилину або очікуй
          email-підтвердження.
        </p>
        <BackHomeCta />
      </ResultCard>
    );
  }

  // failure / reversed / expired
  return (
    <ResultCard variant="error">
      <h1 className="font-heading text-h3 lg:text-h2 text-white mb-3">
        Оплата не пройшла
      </h1>
      <p className="text-white/78 text-base lg:text-lg mb-8">
        {result.failureReason ||
          (result.status === "expired"
            ? "Час дії посилання сплив — спробуй створити нове замовлення."
            : result.status === "reversed"
              ? "Платіж скасовано — кошти повернуто на картку."
              : "Спробуй ще раз або обери оплату при отриманні.")}
      </p>
      <Link
        href="/checkout"
        className="group inline-flex items-center justify-center gap-3 w-full h-14 rounded-[40px] bg-coral text-black font-heading font-bold tracking-[0.05em] uppercase text-base transition-[filter] duration-150 hover:brightness-110"
      >
        Спробувати ще раз
      </Link>
    </ResultCard>
  );
}

function ResultCard({
  variant,
  children,
}: {
  variant: "success" | "pending" | "error";
  children: React.ReactNode;
}) {
  const icon = {
    success: <CheckCircle2 className="w-9 h-9 text-coral" strokeWidth={1.6} />,
    pending: <Loader2 className="w-9 h-9 text-coral animate-spin" strokeWidth={1.6} />,
    error: (
      <XCircle
        className="w-9 h-9 text-[var(--color-error)]"
        strokeWidth={1.6}
      />
    ),
  }[variant];

  const tint = {
    success: "bg-coral/15",
    pending: "bg-coral/15",
    error: "bg-[var(--color-error)]/15",
  }[variant];

  return (
    <main className="container-main pt-28 lg:pt-40 pb-20 min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-xl bg-surface rounded-[var(--radius-checkout-card)] p-8 sm:p-12 text-center">
        <div className={`mx-auto w-16 h-16 rounded-full ${tint} flex items-center justify-center mb-6`}>
          {icon}
        </div>
        {children}
      </div>
    </main>
  );
}

function BackHomeCta() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center justify-center gap-3 w-full h-14 rounded-[40px] bg-coral text-black font-heading font-bold tracking-[0.05em] uppercase text-base transition-[filter] duration-150 hover:brightness-110"
    >
      На головну
    </Link>
  );
}
