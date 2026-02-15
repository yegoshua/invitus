import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductPageContent } from "@/components/product/product-page-content";
import { ProductImagesSection } from "@/components/product/product-images-section";
import { RelatedProducts } from "@/components/product/related-products";
import { FAQSection } from "@/components/sections/faq-section";
import { getProductBySlug, getAllProductSlugs, getProducts } from "@/lib/api";

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

  // Fetch related products (same category, exclude current product)
  const relatedProducts = await getProducts({
    category: product.category,
    limit: 4,
  }).then((products) =>
    products.filter((p) => p.slug !== slug).slice(0, 4)
  );

  // Transform to ProductDetail format expected by ProductPageContent
  const productDetail = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    category: product.category,
    images: product.images,
    sizes: product.sizes || [],
    description: product.description || "",
    howToMeasure: product.howToMeasure || "",
    careInstructions: product.careInstructions || "",
    heroImage: product.heroImage || product.images[0]?.url || "",
    bgImage: product.bgImage || "/assets/img/product_bg.png",
    galleryImages: product.galleryImages || [],
  };

  return (
    <>
      <Header />
      <ProductPageContent product={productDetail} />
      <ProductImagesSection images={productDetail.galleryImages} />
      <RelatedProducts products={relatedProducts} />
      <FAQSection />
      <Footer />
    </>
  );
}
