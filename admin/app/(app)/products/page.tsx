import type { Metadata } from "next";
import { KeyCrmDownBanner } from "@/components/data-banner";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/server";
import { plural, uah } from "@/lib/finance/format";
import { productRanking } from "@/lib/finance/lists";
import { kyivDay, periodFromSearch } from "@/lib/finance/period";
import { loadOrders } from "@/lib/keycrm-orders";

export const metadata: Metadata = { title: "Товари" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const now = new Date();
  const { period, preset } = periodFromSearch(await searchParams, kyivDay(now));
  const data = await loadOrders();
  const products = productRanking(data.orders, period, now);
  const revenue = products.reduce((s, p) => s + p.revenue, 0);
  const units = products.reduce((s, p) => s + p.quantity, 0);

  return (
    <>
      <PageHeader title="Товари" period={period} preset={preset} />
      {!data.ok && <KeyCrmDownBanner />}
      <section className="rounded-[26px] bg-panel px-4 py-2 sm:px-7" aria-labelledby="rank-title">
        <div className="flex flex-wrap justify-between gap-2 pt-3 pb-4">
          <h2 id="rank-title" className="font-sans text-[15px] font-medium text-white/78">Рейтинг за виручкою</h2>
          <p className="text-sm text-muted-foreground">
            {units} шт · {uah(revenue)} · {products.length} {plural(products.length, "позиція", "позиції", "позицій")}
          </p>
        </div>
        {products.length === 0 ? (
          <p className="border-t border-border py-8 text-sm text-[#737373]">У цьому періоді продажів ще немає</p>
        ) : (
          products.map((p, i) => {
            const share = revenue ? Math.round((p.revenue / revenue) * 100) : 0;
            const sizes = p.sizes.map((s) => `${s.size}${s.quantity > 1 ? ` ×${s.quantity}` : ""}`).join(" · ");
            return (
              <div
                key={p.name}
                className="grid grid-cols-[20px_52px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-border py-3.5 sm:grid-cols-[24px_52px_minmax(0,1fr)_60px_100px] dt:grid-cols-[28px_52px_minmax(0,1.2fr)_80px_120px_minmax(0,1fr)]"
              >
                <span className="text-sm text-[#737373]">{i + 1}</span>
                <div className="size-[52px] overflow-hidden rounded-[12px] bg-[repeating-linear-gradient(135deg,#1F1F1F_0_6px,#262626_6px_7px)]">
                  {p.picture && (
                    // KeyCRM's own thumbnails; next/image would need its host allow-listed for nothing gained at 52px.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.picture} alt="" className="block size-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[15px] font-semibold">{p.name}</span>
                  <span className="text-[13px] text-[#737373]">
                    <span className="sm:hidden">{p.quantity} шт{sizes && " · "}</span>
                    {sizes || <span className="hidden sm:inline">без розміру</span>}
                  </span>
                </div>
                <span className="hidden text-right text-[15px] whitespace-nowrap sm:block">{p.quantity} шт</span>
                <span className="text-right text-[15px] font-semibold whitespace-nowrap">{uah(p.revenue)}</span>
                <div className="col-[3/-1] flex items-center gap-2.5 dt:col-auto">
                  <div className="h-2 flex-1 rounded bg-field">
                    <div className="h-full rounded" style={{ width: `${share}%`, background: i === 0 ? "#E74223" : "rgba(231,66,35,0.45)" }} />
                  </div>
                  <span className="w-9 text-right text-[13px] text-muted-foreground">{share}%</span>
                </div>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
