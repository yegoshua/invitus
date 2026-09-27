// Two small concurrency rules the live data leans on (#124).

/**
 * One run per key at a time, in this process: a second caller while the first
 * is still running gets the same promise instead of a second request to the
 * source. The key is freed the moment the run settles, success or not.
 */
export function singleFlight<K, V>() {
  const inFlight = new Map<K, Promise<V>>();
  return {
    run(key: K, fn: () => Promise<V>): Promise<V> {
      const existing = inFlight.get(key);
      if (existing) return existing;
      const p = fn().finally(() => inFlight.delete(key));
      inFlight.set(key, p);
      return p;
    },
    running(key: K): boolean {
      return inFlight.has(key);
    },
  };
}

/** Whether `work` settled (either way) within `ms`. The work itself carries on regardless. */
export async function settledWithin(work: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  try {
    return await Promise.race([work.then(() => true, () => true), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
