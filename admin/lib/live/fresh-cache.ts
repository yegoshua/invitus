// A value read from somewhere slow and rate-limited, kept in memory for a few
// seconds — and kept after that as the last good copy, for when the source is
// down.
//
// Not Next's unstable_cache on purpose: that one is stale-while-revalidate, so
// the first page opened after a quiet hour renders the hour-old copy and only
// refreshes behind it. Here a read past the time-to-live waits for the source;
// only a *failing* source falls back to what was read before.

import { singleFlight } from "./flight.ts";

export type Snapshot<T> =
  /** Read within the time-to-live, or just now. */
  | { value: T; at: Date; error: null }
  /** The source failed; this is the last good copy, as of `at`. */
  | { value: T; at: Date; error: string }
  /** The source failed and nothing was ever read. */
  | { value: null; at: null; error: string };

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function freshCache<T>({
  load,
  ttlMs,
  backoffMs = 0,
  waitMs,
  clock = () => new Date(),
}: {
  load: () => Promise<T>;
  ttlMs: number;
  /** After a failure, serve the last good copy this long before trying the source again. */
  backoffMs?: number;
  /**
   * With a last good copy to show, wait at most this long for the source; the
   * read carries on and lands for the next caller. Without one, wait it out.
   */
  waitMs?: number;
  clock?: () => Date;
}) {
  let last: { value: T; at: Date } | null = null;
  let failure: { at: Date; error: string } | null = null;
  const flight = singleFlight<"load", Snapshot<T>>();

  const read = () =>
    flight.run("load", async () => {
      try {
        const value = await load();
        last = { value, at: clock() };
        failure = null;
        return { ...last, error: null };
      } catch (error) {
        failure = { at: clock(), error: message(error) };
        return last ? { ...last, error: failure.error } : { value: null, at: null, error: failure.error };
      }
    });

  return {
    /** Never throws. `force` reads the source even inside the time-to-live or the back-off. */
    async get({ force = false }: { force?: boolean } = {}): Promise<Snapshot<T>> {
      const now = clock().getTime();
      if (!force && last && now - last.at.getTime() < ttlMs) return { ...last, error: null };
      if (!force && failure && now - failure.at.getTime() < backoffMs) {
        return last ? { ...last, error: failure.error } : { value: null, at: null, error: failure.error };
      }
      const reading = read();
      if (waitMs === undefined || !last) return reading;
      const fallback = last;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const late = new Promise<Snapshot<T>>((resolve) => {
        timer = setTimeout(() => resolve({ ...fallback, error: `no answer in ${waitMs} ms` }), waitMs);
      });
      try {
        return await Promise.race([reading, late]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
