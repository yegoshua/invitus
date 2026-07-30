import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/ui/page-hero";
import { CatalogGrid } from "@/components/sections/catalog-grid";
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
import { breadcrumbSchema } from "@/lib/structured-data";

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

    return {
      title: `${category.name} | INVITUS`,
      description: `Купуйте ${category.name.toLowerCase()} від INVITUS. Українська якість для пауерліфтингу та важкої атлетики.`,
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
  categorySlug,
  filter,
}: {
  categorySlug: string;
  filter: string;
}) {
  const [category, products] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getProducts({ category: categorySlug, filter }),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <>
      {/* Inside Suspense because the category name only exists once this
          resolves. It still lands in the streamed HTML response, so crawlers
          see it without running any JS. */}
      <JsonLd
        data={breadcrumbSchema([
          { name: "Головна", path: "/" },
          { name: category.name, path: `/shop/${category.slug}` },
        ])}
      />
      <PageHero title={`${category.name} (${products.length})`} />
      <CatalogGrid products={products} />
    </>
  );
}

export default async function ShopCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { category: categorySlug } = await params;
  const { filter } = await searchParams;
  const activeFilter = filter || ALL_FILTER_SLUG;

  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogContent categorySlug={categorySlug} filter={activeFilter} />
        </Suspense>
        <FAQSection />
        <BenefitsGrid />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
