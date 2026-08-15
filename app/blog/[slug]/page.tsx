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
  // No try/catch: if Strapi cannot be read at build time the blog must not be
  // built as an empty section. Same reasoning as the listing — see the note at
  // the top of lib/articles.ts.
  const articles = await getArticles();
  return articles.map((article) => ({ slug: article.slug }));
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
          <div className="flex items-center gap-3 font-heading text-xs lg:text-sm font-bold uppercase tracking-wider text-neutral-500">
            <Link href="/blog" className="text-coral hover:text-coral-dark transition-colors">
              Блог
            </Link>
            <span aria-hidden>/</span>
            <span>{article.readingTimeMinutes} хв. читання</span>
          </div>

          {/* The banner's headline scale, kept even though there is no banner:
              the article opens where /blog's red panel would be, and a title
              a size smaller there reads as a subheading of nothing. */}
          <h1 className="font-heading text-[32px] lg:text-[48px] leading-tight font-bold text-white">
            {article.title}
          </h1>

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
