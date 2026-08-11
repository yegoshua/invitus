"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart";
import { formatPriceWithCurrency } from "@/lib/format";
import { CTAButton } from "@/components/ui/cta-button";
import type { Product } from "@/types";

export function TestCheckoutStarter({ product }: { product: Product }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const start = () => {
    setBusy(true);
    // Replace the cart rather than add to it: a leftover belt would turn a
    // 50-copeck test into a real-money one.
    useCartStore.setState({
      items: [{ product, quantity: 1 }],
      isOpen: false,
    });
    router.push("/checkout");
  };

  return (
    <main className="bg-black min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-lg bg-surface rounded-4xl p-8 lg:p-12">
        <p className="text-xs font-bold uppercase tracking-wider text-coral mb-3">
          Службова сторінка
        </p>
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white mb-4">
          Перевірка бойового еквайрингу
        </h1>

        <p className="text-body-2 text-white/70 mb-8">
          Кладе в кошик тестовий товар і відкриває звичайний чекаут. Замовлення
          пройде тим самим кодом, що й справжнє: ціна з KeyCRM, замовлення в
          CRM, інвойс Monobank, підтвердження вебхуком.
        </p>

        <dl className="text-sm border-t border-white/10 divide-y divide-white/10 mb-8">
          <div className="flex justify-between py-3">
            <dt className="text-white/60">Товар</dt>
            <dd className="text-white text-right">{product.name}</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-white/60">Ціна</dt>
            <dd className="text-white">{formatPriceWithCurrency(product.price)}</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-white/60">Доставка</dt>
            <dd className="text-white">Тарифи оператора</dd>
          </div>
        </dl>

        <CTAButton width="fill" onClick={start} disabled={busy}>
          {busy ? "Відкриваю чекаут…" : "Почати перевірку"}
        </CTAButton>

        <p className="text-xs text-white/40 mt-6">
          Оплата справжня. Після перевірки поверни кошти в кабінеті Monobank і
          познач замовлення в KeyCRM як тестове.
        </p>
      </div>
    </main>
  );
}
