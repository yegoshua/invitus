import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CatalogHero } from "@/components/sections/catalog-hero";
import { CatalogGrid } from "@/components/sections/catalog-grid";
import { FAQSection } from "@/components/sections/faq-section";
import { BenefitsGrid } from "@/components/sections/benefits-grid";
import { CartDrawer } from "@/components/layout/cart-drawer";

import {
  getCategoryBySlug,
  getAllCategorySlugs,
  getProducts,
} from "@/lib/api";

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
      { category: "shirts" },
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

  const activeFilter = filter || "all";

  return (
    <>
      <CatalogHero
        categoryName={category.name}
        productCount={products.length}
        filters={category.filters}
        activeFilter={activeFilter}
      />
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
  const activeFilter = filter || "all";

  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="bg-black min-h-screen pt-32 flex items-center justify-center">
              <div className="text-white">Завантаження...</div>
            </div>
          }
        >
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
