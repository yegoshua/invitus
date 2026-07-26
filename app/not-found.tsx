import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NotFoundHero } from "@/components/not-found/not-found-hero";
import { CTAButton } from "@/components/ui/cta-button";

// Root not-found boundary: serves both unmatched URLs and every notFound()
// call in the app (a product or category slug that no longer resolves).
// Without this file Next renders its own bare 404, which drops the user out of
// the site with no way back.
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="bg-black">
        <NotFoundHero />

        <section className="container-main pb-20 lg:pb-30">
          <p className="text-body-1 text-white/70 max-w-xl">
            Схоже, посилання застаріло або цієї сторінки більше немає.
            Повертайся на головну — звідти легко знайти потрібне.
          </p>

          <div className="mt-8 lg:mt-10">
            <CTAButton href="/">На головну</CTAButton>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
