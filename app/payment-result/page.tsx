import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { ClearCartOnMount } from "@/components/checkout/clear-cart-on-mount";
import { ConfettiOverlay } from "@/components/checkout/confetti-overlay";
import {
  ErrorCard,
  PendingCard,
  ResultLayout,
  SuccessCard,
} from "@/components/checkout/payment-result-cards";
import { TrackOnce } from "@/components/analytics/track-once";
import { getInvoiceStatus } from "@/lib/monobank";

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
    const value = (result.finalAmount ?? result.amount) / 100; // copecks → UAH
    return (
      <ResultLayout>
        <ClearCartOnMount />
        {/* Items aren't available here (server page, cart already cleared) —
            GA4 accepts purchase without items; revenue still attributes via
            value + transaction_id. dedupeKey guards against refresh. */}
        <TrackOnce
          event="purchase"
          params={{
            transaction_id: result.reference || invoiceId,
            value,
            items: [],
          }}
          dedupeKey={`purchase_${result.reference || invoiceId}`}
        />
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
