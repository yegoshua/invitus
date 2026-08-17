import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { ArticleBody } from "@/components/blog/article-body";
import { getArticle, getArticles } from "@/lib/articles";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // This list is an optimisation, not a source of truth: `dynamicParams` is on,
  // so a slug missing from it renders on demand and is cached from then on.
  // That is why this one place swallows the error the rest of the blog throws
  // — nothing here can render an empty blog under a 200, and taking a deploy
  // down because the CMS was asleep buys nobody anything. The listing at /blog
  // still refuses to render, which is where the guarantee actually lives.
  try {
    const articles = await getArticles();
    return articles.map((article) => ({ slug: article.slug }));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `[blog] could not prerender article pages (${reason}) — they will render on demand`
    );
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return { title: "Статтю не знайдено | INVITUS" };
  }

  // seoTitle/seoDescription are optional in Strapi and usually left empty; the
  // article's own title and excerpt are the honest fallbacks, not a placeholder.
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt;

  return {
    title: `${title} | INVITUS`,
    description,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${article.slug}`,
      publishedTime: article.publishedAt,
      images: [{ url: article.cover.url, alt: article.cover.alt }],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  // Only reached when Strapi answered and had nothing under this slug —
  // unknown, unpublished or deleted. An unreachable Strapi throws instead of
  // arriving here, so an outage can never be cached as a 404.
  if (!article) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="bg-black pt-24 lg:pt-32 pb-16 lg:pb-24">
        {/* No PageHero: the red banner belongs to /blog. An article opens on
            plain black with its meta row, which is the design's way of saying
            you have arrived at the text rather than at another section. */}
        <div className="container-main flex flex-col gap-6 lg:gap-8">
          {/* Both ends of one line rather than a "Блог / 5 хв." breadcrumb: the
              origin sits at the left margin and the cost of reading at the
              right, which is the same metadata line the cards use.

              One deliberate departure from node 1303:8259, which paints both
              labels at 48% white: "Блог" keeps the coral. It is the only way
              back to the listing, and two identical labels at opposite ends of
              a line give a reader nothing to tell the link from the caption —
              a distinction the static design never has to make. */}
          <div className="flex items-center justify-between gap-3 text-xs leading-4 font-bold uppercase tracking-[0.03em] text-white/48">
            <Link
              href="/blog"
              className="text-coral transition-colors hover:text-coral-dark"
            >
              Блог
            </Link>
            <span className="whitespace-nowrap">
              {article.readingTimeMinutes} хв. читання
            </span>
          </div>

          {/* H2's scale, not H1's, even though this is the page's h1: the
              article opens where /blog's red panel would be, and the design
              sets the title at 40/52 there. font-bold because preflight resets
              heading weight and Druk ships only a 700 face. */}
          <h1 className="text-h2 font-bold text-white">{article.title}</h1>

          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[24px] lg:rounded-section bg-surface">
            <Image
              src={article.cover.url}
              alt={article.cover.alt}
              fill
              // The LCP element of this page, every time.
              priority
              fetchPriority="high"
              sizes="(max-width: 1440px) 100vw, 1408px"
              className="object-cover"
            />
          </div>
        </div>

        {/* The body column is narrower than the container on purpose: cover and
            title span the full width, the text does not. A measure this short is
            what makes a long article readable, not decoration. */}
        <div className="container-main mt-10 lg:mt-14">
          <div className="mx-auto w-full max-w-[750px]">
            <ArticleBody blocks={article.body} />
          </div>
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
