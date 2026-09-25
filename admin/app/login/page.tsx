import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { TelegramLoginButton } from "@/components/telegram-login-button";

export const metadata: Metadata = { title: "Вхід" };

const ERRORS: Record<string, string> = {
  expired: "Посилання для входу застаріло. Спробуй ще раз.",
  "bad-signature": "Telegram не підтвердив вхід. Спробуй ще раз.",
  "missing-fields": "Telegram не підтвердив вхід. Спробуй ще раз.",
  telegram: "Telegram зараз не відповідає. Спробуй за хвилину.",
  config: "Адмінка налаштована не до кінця. Напиши розробнику.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const devLogin = process.env.NODE_ENV === "development" && process.env.ADMIN_DEV_TELEGRAM_ID;

  return (
    <AuthCard>
      <p className="mt-2 text-sm text-muted-foreground">Адмінка для команди</p>
      <div className="mt-8 space-y-4">
        {botUsername ? (
          <TelegramLoginButton botUsername={botUsername} />
        ) : (
          <p className="text-sm text-[var(--color-error)]">TELEGRAM_BOT_USERNAME не задано</p>
        )}
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
