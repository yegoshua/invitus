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
import { getFeaturedProducts } from "@/lib/api";

export default async function Home() {
  const featuredProducts = await getFeaturedProducts(4);
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ProductShowcase products={featuredProducts} />
        <WhySection />
        <MotivationSection/>
        <FeaturesGrid />
        <TestimonialsSection />
        <ShopCTA products={featuredProducts} />
        <FAQSection />
        <BenefitsGrid />
      </main>
      <Footer />
    </>
  );
}
