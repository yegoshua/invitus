/**
 * Loading placeholder for the shop category page. Plain blocks that match the
 * exact sizes of CatalogGrid / ProductCard (1 column on mobile, 4 columns on
 * desktop) so there is no layout shift once the products arrive.
 *
 * It used to reproduce PageHero's footprint too, because the hero sat inside
 * the same Suspense boundary — the h1 carried the product count and so had to
 * wait for the products. The count is gone (#79) and the hero now renders above
 * the boundary, so there is nothing to stand in for: this covers the grid only.
 */
export function CatalogSkeleton() {
  return (
    <section className="bg-black pb-16 lg:pb-24">
      <div className="container-main">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <CatalogCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Plain card block — same total size as ProductCard (square image + two text lines). */
function CatalogCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[24px] bg-surface lg:rounded-[32px]">
      <div className="aspect-square" />
      {/* reserves the name + price height so the card matches ProductCard */}
      <div className="px-5 pt-4 pb-5 lg:px-6 lg:pt-5 lg:pb-6">
        <div className="h-4 lg:h-5" />
        <div className="mt-2 h-4 lg:mt-3 lg:h-5" />
      </div>
    </div>
  );
}
