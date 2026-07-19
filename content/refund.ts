// Content for the "Повернення без питань" (returns) page.
// Static today; if migrated to CMS, swap this file for a fetcher.

export interface RefundGuarantee {
  title: string;
  description: string;
}

// Top trio of guarantee cards (icons paired by index in RefundGuarantees).
export const refundGuarantees: RefundGuarantee[] = [
  {
    title: "14 днів на повернення",
    description: "Рахуємо від дня, коли ти забрав або отримав екіп",
  },
  {
    title: "Доставку оплачуємо ми",
    description: "Зворотня пересилка Новою поштою — повністю за наш рахунок",
  },
  {
    title: "Гроші за 1-3 дні",
    description: "Повертаємо повну суму на картку впродовж 1-3 робочих днів",
  },
];

export interface RefundCondition {
  title: string;
  description: string;
}

// Conditions the gear must meet to be eligible for a return.
export const refundConditions: RefundCondition[] = [
  {
    title: "Екіп зберіг товарний вигляд",
    description: "Не був у використанні, без слідів експлуатації, потертостей і запаху.",
  },
  {
    title: "На місці всі бирки та ярлики",
    description: "Оригінальні бирки й етикетки не зрізані та не пошкоджені.",
  },
  {
    title: "Є підтвердження замовлення",
    description: "Чек або номер замовлення / email, на який ми надсилали підтвердження.",
  },
];

export interface RefundStep {
  title: string;
  description: string;
}

// Three-step return flow (numbered by index in RefundProcess).
export const refundSteps: RefundStep[] = [
  {
    title: "Напиши нам",
    description:
      "Надішли лист на invitus.ua@gmail.com з номером замовлення та причиною повернення",
  },
  {
    title: "Відправ екіп назад",
    description:
      "Ми пришлемо реквізити Нової пошти. Пакуй товар і відправляй — доставку оплачуємо ми",
  },
  {
    title: "Отримай гроші",
    description:
      "Перевіряємо товар і повертаємо повну суму на твою картку за 1–3 робочі дні",
  },
];
