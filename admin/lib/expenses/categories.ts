// Expense categories: a fixed list in code, not a table (PRD #103), so every
// Expense is grouped the same way and a report never meets a category it does
// not know. Pure — the client form imports it.

export const MANUAL_CATEGORIES = [
  { id: "stock", label: "Закупівля товару" },
  { id: "influencers", label: "Реклама (блогери/бартер)" },
  { id: "shipping", label: "Доставка" },
  { id: "refunds", label: "Повернення" },
  { id: "packaging", label: "Пакування та матеріали" },
  { id: "content", label: "Контент" },
  { id: "services", label: "Сервіси" },
  { id: "payroll", label: "Зарплати та підрядники" },
  { id: "taxes", label: "Податки" },
  { id: "other", label: "Інше" },
] as const;

export type ManualCategory = (typeof MANUAL_CATEGORIES)[number]["id"];

/** Ad spend rows written by the ingest (#111) — never chosen in the form. */
export type ExpenseCategory = ManualCategory | "ads";

/** Who wrote the row: a person, or the daily ingest for that ad platform. */
export type ExpenseSource = "manual" | "meta" | "google";

export const MANUAL_CATEGORY_IDS = MANUAL_CATEGORIES.map((c) => c.id) as [ManualCategory, ...ManualCategory[]];

const LABELS: Record<string, string> = Object.fromEntries(MANUAL_CATEGORIES.map((c) => [c.id, c.label]));

export function categoryLabel(category: string, source: ExpenseSource = "manual"): string {
  if (source === "meta") return "Реклама Meta";
  if (source === "google") return "Реклама Google";
  return LABELS[category] ?? "Інше";
}
