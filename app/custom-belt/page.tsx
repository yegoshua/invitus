import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/ui/page-hero";
import { CustomBeltBuilder } from "@/components/custom-belt/custom-belt-builder";
import { getProductById } from "@/lib/api";
import { CUSTOM_BASE } from "@/lib/custom-base";

export const metadata: Metadata = {
  title: "Свій дизайн пояса | INVITUS",
  description:
    "Завантаж свій малюнок і подивись, як він виглядатиме на атлетичному поясі INVITUS у 3D.",
  alternates: { canonical: "/custom-belt" },
  // Not linked from anywhere yet, and not a page anyone should land on from a
  // search until it can take a request (#128) and has a way in (#129).
  robots: { index: false, follow: false },
};

export default async function CustomBeltPage() {
  // The Custom base borrows the Dragon's model. A product that fails to load
  // leaves the builder on the placeholder shape rather than failing the page.
  const base = await getProductById(CUSTOM_BASE.keycrmProductId).catch(() => null);

  return (
    <>
      <Header />
      <main className="bg-black">
        <PageHero title="Свій дизайн пояса" />
        <CustomBeltBuilder modelUrl={base?.model3dUrl} />
      </main>
      <Footer />
    </>
  );
}
