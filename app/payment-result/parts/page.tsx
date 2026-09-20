import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { PartsPending } from "@/components/checkout/parts-pending";
import {
  ErrorCard,
  ResultLayout,
} from "@/components/checkout/payment-result-cards";

export const metadata: Metadata = {
  title: "Покупка частинами | INVITUS",
};

// The order id may come from the cookie, which is per-request.
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ order?: string; ref?: string; total?: string }>;
}

/**
 * Where the checkout lands after a «Покупка частинами» order is created.
 *
 * Unlike acquiring there is no bank page in between: the customer confirms in
 * the mono app on their phone while this tab waits. The client component
 * polls the state and swaps to the success or the refusal card itself.
 */
export default async function PartsResultPage({ searchParams }: PageProps) {
  const { order: queryOrder, ref, total } = await searchParams;
  const cookieStore = await cookies();
  const partsOrderId =
    queryOrder || cookieStore.get("invitus_last_parts_order")?.value || null;
  const totalHint = Number(total);

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <CheckoutHeader />
      {partsOrderId ? (
        <PartsPending
          partsOrderId={partsOrderId}
          orderRef={ref || null}
          totalHint={Number.isFinite(totalHint) && totalHint > 0 ? totalHint : null}
        />
      ) : (
        <ResultLayout>
          <ErrorCard
            title="Не вдалося визначити заявку"
            description="У посиланні немає номера заявки. Якщо ти щойно підтвердив покупку в застосунку mono — все гаразд, ми отримали підтвердження."
          />
        </ResultLayout>
      )}
    </div>
  );
}
