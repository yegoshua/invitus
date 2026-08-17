import type { Metadata } from "next";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { PageHero } from "@/components/ui/page-hero";
import { ArticleCard } from "@/components/ui/article-card";
import { getArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Блог | INVITUS",
  description:
    "Статті INVITUS про екіпірування, техніку та підготовку в пауерліфтингу: як обрати пояс, бинти й наколінники та як за ними доглядати.",
  alternates: { canonical: "/blog" },
};

// One desktop row of the three-column grid. Same reasoning as the catalogue:
// on mobile this is more covers than are visible, but the server cannot know
// the viewport and a lazy LCP image is the expensive mistake.
const ABOVE_THE_FOLD = 3;

export default async function BlogPage() {
  // No try/catch, deliberately. If Strapi cannot be read on a cold render this
  // throws and the page does not render — see the note at the top of
  // lib/articles.ts. Swallowing it would cache an empty blog under a 200.
  const articles = await getArticles();

  return (
    <>
      <Header />
      <main className="bg-black">
        {/* The count is the length of the list below it, not Strapi's total —
            an article dropped for having no cover (see indexArticles) must not
            leave the banner promising a card that isn't there. */}
        <PageHero title={`Блог (${articles.length})`} />

        <section className="pb-12 lg:pb-20">
          <div className="container-main">
            {articles.length === 0 ? (
              // Reached only when Strapi answered and had nothing to give —
              // the honest zero, not a failure wearing its clothes.
              <p className="text-center text-neutral-400 text-xl py-12">
                Статей поки немає. Незабаром тут з&apos;являться матеріали про
                екіпірування й тренування.
              </p>
            ) : (
              // Three columns rather than the catalogue's four: the card is
              // ~30% of the container in the design, and a two-line title over
              // three lines of excerpt in a quarter-width column is a sliver.
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-4 lg:gap-y-6">
                {articles.map((article, index) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    aboveTheFold={index < ABOVE_THE_FOLD}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
