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
      <Link href={`/blog/${article.slug}`} className="block h-full">
        {/* The cover is inset by the card's own padding rather than bleeding to
            its edges — the one structural difference from ProductCard, which
            this card was otherwise cloned from. */}
        <div className="bg-surface rounded-[32px] p-5 h-full flex flex-col gap-5">
          <div className="relative h-[220px] w-full rounded-[24px] overflow-hidden shrink-0">
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

          <div className="flex flex-col gap-4">
            {/* Category and reading time sit at opposite ends of the row, which
                is what makes the reading time read as metadata about the card
                rather than as a second label next to the first. */}
            <div className="flex items-center justify-between gap-3 text-xs leading-4 uppercase tracking-[0.03em]">
              <span className="font-bold text-coral">{article.category}</span>
              <span className="font-semibold text-white/48 whitespace-nowrap">
                {article.readingTimeMinutes} хв. читання
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {/* h2 for the document outline — the h1 is the page's banner. The
                  base layer already gives it the Druk face, which is what the
                  design asks for; only the size is brought down from text-h2 to
                  the 16/24 the card uses. */}
              {/* font-bold explicitly: preflight resets heading weight to
                  inherit, and Druk ships only a 700 face — so without this the
                  browser is asked for a 400 that does not exist. */}
              <h2 className="text-body-2 font-bold tracking-[0.03em] text-white line-clamp-2">
                {article.title}
              </h2>

              {/* Clamped so every card in a row ends at the same place: the
                  cover is a fixed height and the title is capped at two lines,
                  so this is the only part left that could stagger them. */}
              <p className="font-sans text-body-2 font-medium tracking-[0.01em] text-white/48 line-clamp-3">
                {article.excerpt}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
