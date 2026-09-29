import type { Metadata } from "next";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { CheckoutPage } from "@/components/checkout/checkout-page";

export const metadata: Metadata = {
  title: "Оформлення замовлення | INVITUS",
  description:
    "Оформи замовлення INVITUS — атлетичні пояси, екіпірування та аксесуари для пауерліфтингу.",
  // Overrides the root layout's index/follow, which would otherwise be
  // inherited here and say the opposite of robots.txt's disallow.
  robots: { index: false, follow: false },
};

export default function CheckoutRoute() {
  return (
    <div className="bg-black min-h-screen">
      <CheckoutHeader />
      <CheckoutPage />
    </div>
  );
}
