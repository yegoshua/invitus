"use client";

import { useSyncExternalStore } from "react";

// Hydration is not "external state that changes", so there is nothing to
// subscribe to — the snapshot pair alone carries the whole meaning.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` while rendering on the server and through hydration, `true` after.
 *
 * Use it to gate markup that cannot match between server and client — a cart
 * count read from localStorage, a WebGL canvas — where rendering the real value
 * straight away would be a hydration mismatch.
 *
 * This replaces the usual `useState(false)` + `useEffect(() => setMounted(true))`
 * pair. Same behaviour, minus a second render pass, and without a setState in an
 * effect body for the linter to object to.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
