import { TriangleAlert } from "lucide-react";

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
