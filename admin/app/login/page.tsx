import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { Send } from "lucide-react";

export const metadata: Metadata = { title: "Вхід" };

const ERRORS: Record<string, string> = {
  expired: "Вхід тривав задовго або почався в іншій вкладці. Спробуй ще раз.",
  cancelled: "Вхід скасовано.",
  "bad-signature": "Telegram не підтвердив вхід. Спробуй ще раз.",
  telegram: "Telegram зараз не відповідає. Спробуй за хвилину.",
  config: "Адмінка налаштована не до кінця. Напиши розробнику.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const devLogin = process.env.NODE_ENV === "development" && process.env.ADMIN_DEV_TELEGRAM_ID;

  return (
    <AuthCard>
      <p className="mt-2 text-sm text-muted-foreground">Адмінка для команди</p>
      <div className="mt-8 space-y-4">
        {/* A plain link, not a script widget: /auth/start redirects to Telegram. */}
        <a
          href="/auth/start"
          className="flex items-center justify-center gap-2 rounded-[12px] bg-[#2AABEE] py-3 text-[15px] font-medium text-white hover:bg-[#229ED9]"
        >
          <Send className="size-5" aria-hidden />
          Увійти через Telegram
        </a>
        {devLogin && (
          <a
            href="/auth/dev"
            className="block rounded-[12px] border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Увійти локально (тільки dev)
          </a>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-6 text-sm text-[var(--color-error)]">
          {ERRORS[error] ?? ERRORS["bad-signature"]}
        </p>
      )}
    </AuthCard>
  );
}
