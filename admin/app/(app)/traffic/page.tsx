import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PendingKpi, PendingPanel } from "@/components/pending-panel";
import { requireAdmin } from "@/lib/auth/server";
import { kyivDay, periodFromSearch } from "@/lib/finance/period";

export const metadata: Metadata = { title: "Трафік" };

export default async function TrafficPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const { period, preset } = periodFromSearch(await searchParams, kyivDay(new Date()));
  return (
    <>
      <PageHeader title="Трафік" period={period} preset={preset} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <PendingKpi label="Сесії на сайті" note="З GA4" />
        <PendingKpi label="Конверсія сайту" note="Замовлення ÷ сесії" />
        <PendingKpi label="Реклама на 1 замовлення" note="Ad spend ÷ замовлення" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 dt:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <PendingPanel title="Воронка сайту">
          Сесії → кошик → оформлення → замовлення з GA4, поруч із реальними продажами з KeyCRM. Потрібен сервісний акаунт GA4 — підключимо разом із витратами Google Ads.
        </PendingPanel>
        <PendingPanel title="Канали">
          Сесії, замовлення, виручка, реклама і ROAS для Instagram Ads, Google Ads та органіки. Замовлення з Instagram Direct не проходять через сайт і тут не враховуються.
        </PendingPanel>
      </div>
    </>
  );
}
