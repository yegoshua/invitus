import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/ui/page-hero";
import { FAQSection } from "@/components/sections/faq-section";
import {
  installmentsProviderDisclosure,
  installmentsSteps,
} from "@/content/installments";
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
          title={null}
          items={installmentsSteps}
          footnote={
            <div className="mt-8 lg:mt-12 px-6 lg:px-12 flex flex-col gap-2 text-xs/4 tracking-[0.02em] lg:text-sm/5 lg:tracking-[0.01em] text-white/64">
              <p>{installmentsProviderDisclosure.title}</p>
              <p className="font-medium">{installmentsProviderDisclosure.providerLabel}</p>
              <p>{installmentsProviderDisclosure.provider}</p>
              <p className="font-medium">{installmentsProviderDisclosure.termsLabel}</p>
              <ul className="list-disc pl-4">
                {installmentsProviderDisclosure.terms.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>
              <p>
                {installmentsProviderDisclosure.moreInfo}{" "}
                <a
                  href={installmentsProviderDisclosure.moreInfoSite.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-coral transition-colors"
                >
                  {installmentsProviderDisclosure.moreInfoSite.label}
                </a>
              </p>
            </div>
          }
          className="pt-4 lg:pt-8 pb-20 lg:pb-32"
        />
      </main>
      <Footer />
    </>
  );
}
