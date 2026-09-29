import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/site";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { CheckoutPage } from "@/components/checkout/checkout-page";

export const metadata: Metadata = {
  title: "Оформлення замовлення | INVITUS",
  description:
    "Оформи замовлення INVITUS — атлетичні пояси, екіпірування та аксесуари для пауерліфтингу.",
  robots: NO_INDEX,
};

export default function CheckoutRoute() {
  return (
    <div className="bg-black min-h-screen">
      <CheckoutHeader />
      <CheckoutPage />
    </div>
  );
}
