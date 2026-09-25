import { TriangleAlert } from "lucide-react";
import type { FeeData } from "@/lib/fees/store";
import type { OrdersResult } from "@/lib/keycrm-orders";
import type { Freshness } from "@/lib/ingest/run";

export function DatabaseDownBanner() {
  return (
    <p role="alert" className="flex items-center gap-2 rounded-[16px] border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-sm">
      <TriangleAlert className="size-4 shrink-0 text-[var(--color-error)]" aria-hidden />
      Не вдалося прочитати витрати з бази даних. Прибуток і витрати зараз не показуються — онови сторінку за хвилину.
    </p>
  );
}

const AS_OF = new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * «Дані станом на …» for one ingest source, in its own words: `asOf` when some
 * run has worked (with why the latest did not), `never` when none has. Null
 * while the source is fresh — or unknown, which the database banner covers.
 */
function staleText(
  freshness: Freshness | null | undefined,
  asOf: (when: string, why: string) => string,
  never: (why: string) => string
): string | null {
  if (freshness?.state !== "stale") return null;
  const { asOf: when, error } = freshness;
  if (when) return asOf(AS_OF.format(when), error ? `останнє оновлення не вдалося (${error})` : "нічне оновлення давно не запускалось");
  return never(error ? `не завантажились (${error})` : "ще не завантажувались");
}

/**
 * KeyCRM down: over nothing when no read has ever worked in this server
 * instance, otherwise over the last good copy — the figures are whole, only
 * as of an earlier moment.
 */
export function KeyCrmBanner({ orders }: { orders: OrdersResult }) {
  if (!orders.ok) {
    return (
      <p role="alert" className="flex items-center gap-2 rounded-[16px] border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-sm">
        <TriangleAlert className="size-4 shrink-0 text-[var(--color-error)]" aria-hidden />
        Не вдалося завантажити замовлення з KeyCRM. Цифри нижче неповні — онови сторінку за хвилину.
      </p>
    );
  }
  if (!orders.error) return null;
  return (
    <StaleBanner
      text={`Замовлення KeyCRM — дані станом на ${AS_OF.format(orders.fetchedAt)}: KeyCRM зараз не відповідає. Нові замовлення й зміни статусів після цього часу ще не враховані.`}
    />
  );
}

function StaleBanner({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-[16px] border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
      <TriangleAlert className="size-4 shrink-0 text-primary" aria-hidden />
      {text}
    </p>
  );
}

/**
 * The actual fees: shown when the last Monobank ingest failed or has not run
 * for a night. Nothing is hidden — the orders it did not reach keep their
 * estimate, marked «≈».
 */
export function FeesBanner({ fees }: { fees: FeeData }) {
  const text = !fees.ok
    ? "Не вдалося прочитати комісії з бази даних. Комісії нижче — оцінка за стандартними ставками."
    : staleText(
        fees.monobank,
        (when, why) => `Комісії Monobank — дані станом на ${when}: ${why}. Пізніші оплати показані з оцінкою «≈».`,
        (why) => `Фактичні комісії Monobank ${why}. Усі комісії поки — оцінка «≈».`
      );
  return <StaleBanner text={text} />;
}

/**
 * Meta's Ad spend. Unlike a fee there is no estimate to fall back on: days
 * the ingest did not reach are simply missing, so Ad spend reads low and ROAS
 * high until it catches up — the banner says which way the figures lean.
 */
export function AdSpendBanner({ meta }: { meta: Freshness | null }) {
  return (
    <StaleBanner
      text={staleText(
        meta,
        (when, why) =>
          `Реклама Meta — дані станом на ${when}: ${why}. Пізніші дні ще без витрат Meta, тож витрати на рекламу й CAC занижені, а ROAS завищений.`,
        (why) => `Витрати на рекламу Meta ${why}. Витрати на рекламу, ROAS і CAC поки рахуються без Meta.`
      )}
    />
  );
}
