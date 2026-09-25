import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PendingKpi, PendingPanel } from "@/components/pending-panel";
import { requireAdmin } from "@/lib/auth/server";
import { kyivDay, periodFromSearch } from "@/lib/finance/period";

export const metadata: Metadata = { title: "Витрати" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const { period, preset } = periodFromSearch(await searchParams, kyivDay(new Date()));
  return (
    <>
      <PageHeader
        title="Витрати"
        period={period}
        preset={preset}
        action={
          <button
            disabled
            title="Потрібна база даних — наступний крок"
            className="h-11 cursor-not-allowed rounded-[14px] bg-primary px-5 text-[15px] font-semibold whitespace-nowrap text-black opacity-40"
          >
            + Додати витрату
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 dt:grid-cols-4">
        <PendingKpi label="Усього витрат" note="з комісіями і рекламою" />
        <PendingKpi label="Реклама" note="Meta і Google, автоматично" />
        <PendingKpi label="Комісії" note="оцінка, потім факт з виписки" />
        <PendingKpi label="Інші витрати" note="записи вручну" />
      </div>
      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 dt:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <PendingPanel title="За категоріями">Розподіл витрат за категоріями з&apos;явиться з першими записами.</PendingPanel>
        <PendingPanel title="Записи вручну">
          Щоб вносити витрати, адмінці потрібна база даних. Підключи Neon у Vercel (проєкт invitus-admin → Storage), і наступним кроком тут з&apos;явиться журнал і форма «Нова витрата».
        </PendingPanel>
      </div>
    </>
  );
}
