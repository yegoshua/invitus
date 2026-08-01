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
  category,
  filter,
}: {
  category: Category;
  filter: string;
}) {
  const products = await getProducts({ category: category.slug, filter });

  return (
    <>
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

  // Resolved here rather than inside <Suspense>. Once the shell has streamed,
  // the 200 is already on the wire, so a notFound() deeper in the tree renders
  // the not-found screen under a 200 — a soft 404 that Google happily keeps in
  // the index. Only the category list is awaited (small and cached); the slow
  // products fetch stays behind the skeleton.
  const category = await getCategoryBySlug(categorySlug);
  if (!category) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Головна", path: "/" },
          { name: category.name, path: `/shop/${category.slug}` },
        ])}
      />
      <Header />
      <main>
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogContent category={category} filter={activeFilter} />
        </Suspense>
        <FAQSection />
        <BenefitsGrid />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
