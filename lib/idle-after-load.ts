/**
 * "After the page has arrived, in a quiet moment, and not on a metered
 * connection."
 *
 * This exists as its own module with its own tests because #39 named the timing
 * of the 3D warm-up as the single easiest thing in that work to get wrong:
 * scheduled before the `load` event it pulls the 283 KB chunk straight back
 * into the measurement window and cancels its own benefit — while looking
 * perfectly correct in review. A rule that subtle should be assertable without
 * a browser, so the browser is a parameter.
 */

export type IdleAfterLoadDeps = {
  /** `navigator.connection.saveData` — speculative fetching is not for metered connections. */
  saveData: boolean;
  /** Has the `load` event already fired? */
  hasLoaded: () => boolean;
  /** Subscribe to the `load` event. Returns an unsubscribe. */
  onLoad: (run: () => void) => () => void;
  /** Ask for idle time. Returns a cancel. */
  whenIdle: (run: () => void) => () => void;
};

/**
 * Runs `task` at most once, and only once both conditions hold. Returns a
 * cancel function that is safe to call at any point.
 */
export function scheduleIdleAfterLoad(
  task: () => void,
  { saveData, hasLoaded, onLoad, whenIdle }: IdleAfterLoadDeps,
): () => void {
  // Not "later" — never. Intent-driven warming still applies; a visitor who
  // reaches for a product still gets the chunk, they simply do not pay for it
  // on the chance that they might.
  if (saveData) return () => {};

  let cancelled = false;
  let cancelIdle: (() => void) | undefined;
  let unsubscribeFromLoad: (() => void) | undefined;

  const queue = () => {
    if (cancelled) return;
    cancelIdle = whenIdle(() => {
      if (cancelled) return;
      cancelled = true;
      task();
    });
  };

  if (hasLoaded()) {
    queue();
  } else {
    unsubscribeFromLoad = onLoad(queue);
  }

  return () => {
    cancelled = true;
    unsubscribeFromLoad?.();
    cancelIdle?.();
  };
}
