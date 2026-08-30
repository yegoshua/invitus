import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/ui/page-hero";
import { CatalogGrid } from "@/components/sections/catalog-grid";
import { CategoryIntro } from "@/components/sections/category-intro";
import { FAQSection } from "@/components/sections/faq-section";
import { BenefitsGrid } from "@/components/sections/benefits-grid";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { CatalogSkeleton } from "@/components/sections/catalog-skeleton";
import { JsonLd } from "@/components/seo/json-ld";

import {
  getCategoryBySlug,
  getAllCategorySlugs,
  getProducts,
} from "@/lib/api";
import { ALL_FILTER_SLUG } from "@/lib/filter";
import { resolveCategoryCopy } from "@/lib/category-copy";
import { breadcrumbSchema } from "@/lib/structured-data";
import type { Category } from "@/types";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ filter?: string }>;
}

export async function generateStaticParams() {
  try {
    const slugs = await getAllCategorySlugs();
    return slugs.map((category) => ({ category }));
  } catch {
    // Fallback to hardcoded slugs if Strapi is not available
    return [
      { category: "belts" },
      { category: "wrist-wraps" },
      { category: "straps" },
      { category: "knee-sleeves" },
    ];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;

  try {
    const category = await getCategoryBySlug(categorySlug);

    if (!category) {
      return {
        title: "Категорія не знайдена | INVITUS",
      };
    }

    const copy = resolveCategoryCopy(categorySlug, category.name);

    return {
      title: `${copy.h1} | INVITUS`,
      description: copy.metaDescription,
      // Query-less on purpose: ?filter= narrows the same catalog rather than
      // producing a new page, so every filtered view points the index back at
      // the bare category URL.
      alternates: { canonical: `/shop/${categorySlug}` },
    };
  } catch {
    return {
      title: "Каталог | INVITUS",
    };
  }
}

async function CatalogContent({
  category,
  filter,
}: {
  category: Category;
  filter: string;
}) {
  const products = await getProducts({ category: category.slug, filter });

  return <CatalogGrid products={products} />;
}

export default async function ShopCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { category: categorySlug } = await params;
  const { filter } = await searchParams;
  const activeFilter = filter || ALL_FILTER_SLUG;

  // Resolved here rather than inside <Suspense>. Once the shell has streamed,
  // the 200 is already on the wire, so a notFound() deeper in the tree renders
  // the not-found screen under a 200 — a soft 404 that Google happily keeps in
  // the index. Only the category list is awaited (small and cached); the slow
  // products fetch stays behind the skeleton.
  const category = await getCategoryBySlug(categorySlug);
  if (!category) {
    notFound();
  }

  const copy = resolveCategoryCopy(categorySlug, category.name);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Головна", path: "/" },
          // The h1, not category.name: with copy in play those two differ,
          // and a breadcrumb leaf naming something the page never says is
          // markup contradicting the rendered page.
          { name: copy.h1, path: `/shop/${category.slug}` },
        ])}
      />
      <Header />
      <main>
        {/* Outside the Suspense boundary: the heading no longer carries the
            product count, so it no longer waits on the products fetch. The h1
            now ships in the streamed shell instead of arriving with the grid. */}
        <PageHero title={copy.h1} />
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogContent category={category} filter={activeFilter} />
        </Suspense>
        {copy.intro && <CategoryIntro intro={copy.intro} />}
        <FAQSection />
        <BenefitsGrid />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
