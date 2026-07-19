import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { RefundHero } from "@/components/refund/refund-hero";
import { RefundGuarantees } from "@/components/refund/refund-guarantees";
import { RefundProcess } from "@/components/refund/refund-process";

export const metadata: Metadata = {
  title: "Повернення без питань | INVITUS",
  description:
    "Повертай екіп INVITUS протягом 14 днів. Зворотну доставку оплачуємо ми, а гроші повертаємо на картку за 1-3 робочі дні.",
};

export default function RefundRoute() {
  return (
    <>
      <Header />
      <main className="bg-black">
        <RefundHero />
        <RefundGuarantees />
        <RefundProcess />
      </main>
      {/* Cancel Footer's own top padding (pt-12 lg:pt-16) so it doesn't stack
          with RefundProcess's pb — the section owns the full 40/180 gap. */}
      <div className="-mt-12 lg:-mt-16">
        <Footer />
      </div>
    </>
  );
}
