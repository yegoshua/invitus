// Hidden smoke-test page for live acquiring.
//
// Not linked from anywhere, not in the sitemap, noindex. It drops the 0.50 UAH
// test product (KeyCRM id 44, in the hidden "Службове (тест)" category) into the
// cart and hands over to the normal checkout — so a real-card test runs through
// exactly the same pricing, order and payment code as a customer would, for 50
// copecks instead of 120.50 (orders containing only this product ship free).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchKeyCrm } from "@/lib/keycrm";
import { TEST_PRODUCT_ID } from "@/lib/orders";
import type { KeyCrmProduct } from "@/lib/keycrm-schema";
import type { Product } from "@/types";
import { TestCheckoutStarter } from "./test-checkout-starter";

export const metadata: Metadata = {
  title: "Перевірка оплати | INVITUS",
  robots: { index: false, follow: false },
};

// Always read the live price — this page exists to prove what really happens.
export const dynamic = "force-dynamic";

export default async function TestPaymentPage() {
  let raw: KeyCrmProduct;
  try {
    raw = await fetchKeyCrm<KeyCrmProduct>(`/products/${TEST_PRODUCT_ID}`, {
      revalidate: 0,
    });
  } catch {
    notFound();
  }

  const product: Product = {
    id: String(raw.id),
    documentId: String(raw.id),
    name: raw.name,
    slug: `test-${raw.id}`,
    price: raw.min_price,
  };

  return <TestCheckoutStarter product={product} />;
}
