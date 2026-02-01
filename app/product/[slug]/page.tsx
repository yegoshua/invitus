import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductPageContent } from "@/components/product/product-page-content";
import { ProductImagesSection } from "@/components/product/product-images-section";
import { RelatedProducts } from "@/components/product/related-products";
import { FAQSection } from "@/components/sections/faq-section";
import { getProductBySlug, products } from "@/data/products";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "Товар не знайдено | INVITUS" };
  }

  return {
    title: `${product.name} | INVITUS`,
    description: product.description,
  };
}

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <>
      <Header />
      <ProductPageContent product={product} />
      <ProductImagesSection images={product.galleryImages} />
      <RelatedProducts />
      <FAQSection />
      <Footer />
    </>
  );
}
