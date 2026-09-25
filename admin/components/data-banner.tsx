import { TriangleAlert } from "lucide-react";
import type { FeeData } from "@/lib/fees/store";

export function DatabaseDownBanner() {
  return (
    <p role="alert" className="flex items-center gap-2 rounded-[16px] border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-sm">
      <TriangleAlert className="size-4 shrink-0 text-[var(--color-error)]" aria-hidden />
      Не вдалося прочитати витрати з бази даних. Прибуток і витрати зараз не показуються — онови сторінку за хвилину.
    </p>
  );
}

export function KeyCrmDownBanner() {
  return (
    <p role="alert" className="flex items-center gap-2 rounded-[16px] border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-sm">
      <TriangleAlert className="size-4 shrink-0 text-[var(--color-error)]" aria-hidden />
      Не вдалося завантажити замовлення з KeyCRM. Цифри нижче неповні — онови сторінку за хвилину.
    </p>
  );
}

const AS_OF = new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * «Дані станом на …» for the actual fees: shown when the last Monobank ingest
 * failed or has not run for a night. Nothing is hidden — the orders it did
 * not reach keep their estimate, marked «≈».
 */
export function FeesBanner({ fees }: { fees: FeeData }) {
  let text: string;
  if (!fees.ok) {
    text = "Не вдалося прочитати комісії з бази даних. Комісії нижче — оцінка за стандартними ставками.";
  } else if (fees.monobank?.state === "stale") {
    const { asOf, error } = fees.monobank;
    if (asOf) {
      const why = error ? `останнє оновлення не вдалося (${error})` : "нічне оновлення давно не запускалось";
      text = `Комісії Monobank — дані станом на ${AS_OF.format(asOf)}: ${why}. Пізніші оплати показані з оцінкою «≈».`;
    } else {
      const why = error ? `не завантажились (${error})` : "ще не завантажувались";
      text = `Фактичні комісії Monobank ${why}. Усі комісії поки — оцінка «≈».`;
    }
  } else return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-[16px] border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
      <TriangleAlert className="size-4 shrink-0 text-primary" aria-hidden />
      {text}
    </p>
  );
}
