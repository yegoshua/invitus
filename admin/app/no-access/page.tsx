import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = { title: "Немає доступу" };

export default function NoAccessPage() {
  return (
    <AuthCard>
      <h1 className="mt-8 font-sans text-xl font-semibold">Немає доступу</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Доступ мають лише учасники чату «Фінанси». Попроси додати тебе в чат, і тоді увійди ще раз.
      </p>
      <Link
        href="/login"
        className="mt-8 block rounded-[12px] bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-[var(--color-coral-dark)]"
      >
        Спробувати ще раз
      </Link>
    </AuthCard>
  );
}
