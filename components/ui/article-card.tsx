import Image from "next/image";
import Link from "next/link";
import type { ArticleSummary } from "@/types";

interface ArticleCardProps {
  article: ArticleSummary;
  /**
   * Cards in the first screenful. Their covers load eagerly — one of them is
   * the page's LCP element, and the catalogue already paid to learn that
   * lazy-loading it costs seconds (#60).
   */
  aboveTheFold?: boolean;
}

/**
 * A single article in the listing. Deliberately a server component: the whole
 * card is a link with CSS hover, so there is nothing for the client to do, and
 * keeping it on the server is what stops the article body — which the reading
 * time is computed from — from ever being serialised into the page.
 */
export function ArticleCard({ article, aboveTheFold = false }: ArticleCardProps) {
  return (
    <article className="group">
      <Link href={`/blog/${article.slug}`} className="block">
        <div className="bg-surface rounded-[24px] lg:rounded-[32px] overflow-hidden h-full flex flex-col">
          <div className="relative aspect-[16/10] overflow-hidden">
            <Image
              src={article.cover.url}
              alt={article.cover.alt}
              fill
              priority={aboveTheFold}
              // The grid's own breakpoints — md (768) to two columns, lg (1024)
              // to three. They have to be these numbers and not the catalogue's:
              // a 640 here tells the browser 50vw for the 640–767 band, where
              // the layout is still one column, and the eager LCP cover arrives
              // at half the width it is displayed at.
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          <div className="px-5 lg:px-6 pt-4 pb-5 lg:pt-5 lg:pb-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-coral px-3 py-1 font-heading text-xs font-bold uppercase tracking-wider text-white">
                {article.category}
              </span>
              <span className="text-sm text-neutral-400">
                {article.readingTimeMinutes} хв. читання
              </span>
            </div>

            {/* h2 for the document outline — the h1 is the page's banner. The
                font is set back to the body face on purpose: the base layer
                gives every h2 the Druk heading face, and a card title in Druk
                is a different card language from the product grid's. */}
            <h2 className="font-sans text-lg lg:text-xl leading-tight tracking-[0.01em] font-medium text-white">
              {article.title}
            </h2>

            <p className="text-sm lg:text-base leading-snug text-neutral-400 line-clamp-3">
              {article.excerpt}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
