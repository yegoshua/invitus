import type { Metadata } from "next";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { CheckoutPage } from "@/components/checkout/checkout-page";

export const metadata: Metadata = {
  title: "Оформлення замовлення | INVITUS",
  description:
    "Оформи замовлення INVITUS — атлетичні пояси, екіпірування та аксесуари для пауерліфтингу.",
};

export default function CheckoutRoute() {
  return (
    <div className="bg-black min-h-screen">
      <CheckoutHeader />
      <CheckoutPage />
    </div>
  );
}
