import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/ui/page-hero";
import { FAQSection } from "@/components/sections/faq-section";
import { installmentsSteps } from "@/content/installments";
import { formatPrice } from "@/lib/format";
import { PARTS_MIN_TOTAL, PARTS_OPTIONS } from "@/lib/installments";

export const metadata: Metadata = {
  title: "Покупка частинами | INVITUS",
  description: `Екіп INVITUS частинами через monobank — без відсотків і комісій, на ${PARTS_OPTIONS.join(", ")} платежів для замовлень від ${formatPrice(PARTS_MIN_TOTAL)} ₴. Підтвердження в застосунку mono.`,
  alternates: { canonical: "/installments" },
};

export default function InstallmentsRoute() {
  return (
    <>
      <Header />
      <main className="bg-black">
        <PageHero title="Покупка частинами" />
        <FAQSection
          title="Як це працює"
          items={installmentsSteps}
          className="pt-4 lg:pt-8 pb-20 lg:pb-32"
        />
      </main>
      <Footer />
    </>
  );
}
