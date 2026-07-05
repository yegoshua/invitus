/**
 * Loading placeholder for the shop category page. Plain blocks that match the
 * exact sizes of CatalogHero + CatalogGrid / ProductCard (1 column on mobile,
 * 4 columns on desktop) so there is no layout shift once the products arrive.
 */
export function CatalogSkeleton() {
  return (
    <>
      {/* Hero placeholder — same footprint as CatalogHero */}
      <div className="bg-black px-2 pb-4 sm:p-3 lg:p-4">
        <div className="mt-16 animate-pulse rounded-[24px] bg-surface py-6 lg:mt-0 lg:rounded-section lg:pt-30 lg:pb-16">
          <div className="container-main">
            {/* reserves the h1 height so the block matches the real hero */}
            <div className="h-8 lg:h-12" />
          </div>
        </div>
      </div>

      {/* Grid placeholder — same layout as CatalogGrid */}
      <section className="bg-black pb-16 lg:pb-24">
        <div className="container-main">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <CatalogCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    </>
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
