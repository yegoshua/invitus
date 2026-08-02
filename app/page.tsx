import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero-section";
import { ProductShowcase } from "@/components/sections/product-showcase";
import { WhySection } from "@/components/sections/why-section";
import { FeaturesGrid } from "@/components/sections/features-grid";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { ShopCTA } from "@/components/sections/shop-cta";
import { FAQSection } from "@/components/sections/faq-section";
import { BenefitsGrid } from "@/components/sections/benefits-grid";
import { MotivationSection } from "@/components/sections/motivation-section";
import { getHomepageSection } from "@/lib/api";
import type { Metadata } from "next";

// Title and description are inherited from the root layout; this only pins the
// canonical, so the homepage served from a preview deploy or any other host
// still points the index at the real domain.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  // Two visually distinct sections, curated independently in Strapi's Homepage
  // single type. They used to share one `getFeaturedProducts` call and so
  // always showed the same four products.
  const [showcaseProducts, shopCtaProducts] = await Promise.all([
    getHomepageSection("showcase"),
    getHomepageSection("shopCta"),
  ]);
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ProductShowcase products={showcaseProducts} />
        <WhySection />
        <MotivationSection/>
        <FeaturesGrid />
        <TestimonialsSection />
        <ShopCTA products={shopCtaProducts} />
        <FAQSection />
        <BenefitsGrid />
      </main>
      <Footer />
    </>
  );
}
