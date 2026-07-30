import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductPageContent } from "@/components/product/product-page-content";
import { ProductImagesSection } from "@/components/product/product-images-section";
import { RelatedProducts } from "@/components/product/related-products";
import { FAQSection } from "@/components/sections/faq-section";
import { BenefitsGrid } from "@/components/sections/benefits-grid";
import { JsonLd } from "@/components/seo/json-ld";
import {
  getProductBySlug,
  getAllProductSlugs,
  getProducts,
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
    getProducts({ category: product.category, limit: 4 }).then((products) =>
      products.filter((p) => p.slug !== slug).slice(0, 4)
    ),
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
      <ProductImagesSection images={product.galleryImages || []} />
      <RelatedProducts products={relatedProducts} />
      <FAQSection />
      <BenefitsGrid />
      <Footer />
    </>
  );
}
