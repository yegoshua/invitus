"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { ArnoldLoader } from "@/components/ui/arnold-loader";
import { scheduleIdleAfterLoad } from "@/lib/idle-after-load";

/**
 * The seam between the product page and three.js.
 *
 * `model-loader` pulls in three.js, r3f, drei and GLTFLoader — 283 KB packed,
 * about a megabyte unpacked. Imported statically it lands in the product
 * route's entry chunk, and because Next prefetches that route as soon as a
 * product card enters the viewport, the *homepage* downloaded all of it to
 * render no 3D whatsoever. Behind this dynamic import it becomes a chunk of its
 * own that nothing fetches until something asks.
 *
 * Deferring alone would only trade a slow homepage for a slow product
 * transition, so the chunk is warmed rather than merely deferred: on the intent
 * to open a product, and failing that in the first quiet moment after the page
 * has finished loading.
 *
 * Every path below goes through this one `import()` expression on purpose —
 * that identity is what makes the warm-up and the render share a chunk instead
 * of fetching two.
 */
const importModelLoader = () => import("./model-loader");

export const ModelViewer = dynamic(
  () => importModelLoader().then((m) => m.ModelLoader),
  {
    // WebGL has no server-side equivalent; the canvas could never have been
    // part of the server render.
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <ArnoldLoader />
      </div>
    ),
  },
);

let warming = false;

/**
 * Starts fetching the 3D chunk. Cheap to call as often as you like — the first
 * call is the only one that costs anything, and the browser cache would absorb
 * the rest anyway.
 *
 * Call it on the *intent* to open a product: a pointer arriving on a card, or a
 * finger landing on one.
 */
export function warmModelViewer(): void {
  if (warming) return;
  warming = true;
  void importModelLoader();
}

/**
 * The fallback for visitors who never hover — a touch device where the first
 * contact with a card is already the tap, or anyone who scrolls and reads
 * before deciding.
 *
 * Call once per page that lists products. The rules it schedules under are in
 * `lib/idle-after-load.ts`, tested there: strictly after the `load` event, in
 * idle time, and not at all under `save-data`.
 */
export function useWarmModelViewerWhenIdle(): void {
  useEffect(() => {
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;

    return scheduleIdleAfterLoad(warmModelViewer, {
      saveData: Boolean(connection?.saveData),
      hasLoaded: () => document.readyState === "complete",
      onLoad: (run) => {
        window.addEventListener("load", run, { once: true });
        return () => window.removeEventListener("load", run);
      },
      whenIdle: (run) => {
        if (typeof requestIdleCallback === "undefined") {
          // Safari before 18. A timeout is a poor idle, but it is still after
          // load, which is the part that matters.
          const timer = window.setTimeout(run, 1000);
          return () => window.clearTimeout(timer);
        }
        const handle = requestIdleCallback(run, { timeout: 3000 });
        return () => cancelIdleCallback(handle);
      },
    });
  }, []);
}
