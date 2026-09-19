import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductPageContent } from "@/components/product/product-page-content";
import { ProductImagesSection } from "@/components/product/product-images-section";
import { ProductDetailsSection } from "@/components/product/product-details-section";
import { beltAttributes } from "@/content/belt-attributes";
import { RelatedProducts } from "@/components/product/related-products";
import { FAQSection } from "@/components/sections/faq-section";
import { BenefitsGrid } from "@/components/sections/benefits-grid";
import { JsonLd } from "@/components/seo/json-ld";
import {
  getProductBySlug,
  getAllProductSlugs,
  getRelatedProducts,
  getCategoryBySlug,
} from "@/lib/api";
import { breadcrumbSchema, productSchema } from "@/lib/structured-data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getProductBySlug(slug);

    if (!product) {
      return { title: "Товар не знайдено | INVITUS" };
    }

    return {
      title: `${product.name} | INVITUS`,
      description: product.description,
      alternates: { canonical: `/product/${slug}` },
    };
  } catch {
    return { title: "Товар | INVITUS" };
  }
}

export async function generateStaticParams() {
  try {
    const slugs = await getAllProductSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    // Fallback if Strapi is not available
    return [];
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [relatedProducts, category] = await Promise.all([
    getRelatedProducts(product),
    // Only needed for the breadcrumb trail and the Product `category` field;
    // the categories listing is already cached, so this is not an extra
    // round-trip to KeyCRM in practice.
    product.category ? getCategoryBySlug(product.category) : null,
  ]);

  const breadcrumbs = [
    { name: "Головна", path: "/" },
    ...(category
      ? [{ name: category.name, path: `/shop/${category.slug}` }]
      : []),
    { name: product.name, path: `/product/${product.slug}` },
  ];

  return (
    <>
      <JsonLd
        data={[
          productSchema(product, category?.name),
          breadcrumbSchema(breadcrumbs),
        ]}
      />
      <Header />
      <ProductPageContent product={product} />
      <ProductImagesSection
        images={product.galleryImages || []}
        // Belts only, for now: the other categories keep the plain photo grid
        // until they get copy of their own.
        attributes={product.category === "belts" ? beltAttributes : undefined}
      />
      <ProductDetailsSection product={product} />
      <RelatedProducts
        products={relatedProducts}
        categorySlug={category?.slug}
      />
      <FAQSection />
      <BenefitsGrid />
      <Footer />
    </>
  );
}
