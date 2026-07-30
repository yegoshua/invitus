"use client";

import { useEffect } from "react";

// Last line of defence: this catches a throw in the root layout itself, which
// app/error.tsx cannot, because error.tsx renders *inside* the layout it would
// have to replace.
//
// Two constraints follow from that, and both are why this file looks nothing
// like the rest of the app:
//
//   1. It must supply its own <html> and <body> — there is no layout above it.
//   2. It replaces the root layout, so everything the root layout brings is
//      gone: app/globals.css is imported there, which means no Tailwind, no CSS
//      variables, no --font-druk. Every class name would silently do nothing,
//      so the styling here is inline on purpose. It is not a shortcut.
//
// The same logic argues for keeping it dependency-free. A boundary that exists
// because rendering failed must not itself depend on much: no Header, no
// design-system imports, nothing that could be the very thing that broke.

const CORAL = "#E74223";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[INVITUS] root layout error:", error);
  }, [error]);

  return (
    <html lang="uk">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000",
          color: "#fff",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "520px", textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 28px",
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: CORAL,
            }}
          >
            INVITUS
          </p>

          <h1
            style={{
              margin: "0 0 16px",
              fontSize: "clamp(28px, 6vw, 40px)",
              lineHeight: 1.15,
              fontWeight: 700,
            }}
          >
            Сайт тимчасово недоступний
          </h1>

          <p
            style={{
              margin: "0 0 32px",
              fontSize: "16px",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Ми вже знаємо про проблему і розбираємось. Спробуй оновити сторінку
            за хвилину.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              appearance: "none",
              border: "none",
              cursor: "pointer",
              backgroundColor: CORAL,
              color: "#000",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "20px 36px",
              borderRadius: "24px",
            }}
          >
            Оновити
          </button>

          {error.digest ? (
            <p
              style={{
                margin: "28px 0 0",
                fontSize: "13px",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              Код помилки: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
