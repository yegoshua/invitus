"use client";

import { useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/ui/page-hero";
import { CTAButton } from "@/components/ui/cta-button";

// Root error boundary — the counterpart to not-found.tsx, for the case where a
// route threw rather than resolved to nothing.
//
// The realistic trigger is an upstream outage: every catalogue and product page
// is built from KeyCRM, which is a single-homed API, so an unreachable moment
// there throws mid-render. ISR usually hides that (the previously rendered page
// keeps being served), but a route with nothing cached yet — a fresh deployment,
// a category nobody has opened — has nothing to fall back to, and without this
// file Next renders its own untranslated error page on white.
//
// `reset()` re-renders the segment without a full page load, which is exactly
// the right affordance here: the failure is usually transient, so trying again
// often works. Hence the retry sits first and solid, with the way home second.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reaches the Vercel function logs, so a report from a customer can be
    // matched to the real cause rather than guessed at.
    console.error("[INVITUS] route error:", error);
  }, [error]);

  return (
    <>
      <Header />
      <main className="bg-black">
        <PageHero title="Щось пішло не так" />

        <section className="container-main pb-20 lg:pb-30">
          <p className="text-body-1 text-white/70 max-w-xl">
            Сторінка не завантажилась — найчастіше це тимчасово. Спробуй ще
            раз, а якщо не допоможе, напиши нам в Instagram, і ми розберемось.
          </p>

          <div className="mt-8 flex flex-col gap-4 lg:mt-10 lg:flex-row">
            <CTAButton onClick={reset}>Спробувати ще раз</CTAButton>
            <CTAButton href="/" variant="outline">
              На головну
            </CTAButton>
          </div>

          {/* The digest is the only identifier that ties what the customer saw
              to a line in the logs. The message itself is deliberately not
              shown: in production Next replaces it with a generic string for
              server errors anyway, and for client errors it can carry internals
              that mean nothing to a customer. */}
          {error.digest ? (
            <p className="mt-8 text-body-2 text-white/40">
              Код помилки: {error.digest}
            </p>
          ) : null}
        </section>
      </main>
      <Footer />
    </>
  );
}
