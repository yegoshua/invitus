"use client";

import { useEffect, useState } from "react";
import {
  searchCities,
  getWarehouses,
  type NpCity,
  type NpWarehouse,
} from "@/lib/nova-poshta";

const DEBOUNCE_MS = 300;

const cityCache = new Map<string, NpCity[]>();
const branchCache = new Map<string, NpWarehouse[]>();

interface AsyncResult<T> {
  data: T[];
  isLoading: boolean;
}

/**
 * Pattern note: we avoid synchronous setState calls inside useEffect bodies
 * (React 19 anti-pattern). Instead we derive `data`/`isLoading` from a
 * module-level cache on every render, and the effect only kicks off a network
 * fetch when the cache misses. The fetch callback writes to the cache and
 * triggers a re-render via a "bump" counter.
 */

export function useNovaPoshtaCities(query: string): AsyncResult<NpCity> {
  const [, bump] = useState(0);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) return;
    if (cityCache.has(q)) return;

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      const cities = await searchCities(q, controller.signal);
      if (controller.signal.aborted) return;
      cityCache.set(q, cities);
      bump((n) => n + 1);
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [q]);

  if (q.length < 2) return { data: [], isLoading: false };
  const cached = cityCache.get(q);
  if (cached) return { data: cached, isLoading: false };
  return { data: [], isLoading: true };
}

export function useNovaPoshtaBranches(
  cityRef: string | null,
  query: string
): AsyncResult<NpWarehouse> {
  const [, bump] = useState(0);
  const q = query.trim();
  const cacheKey = cityRef ? `${cityRef}::${q}` : null;

  useEffect(() => {
    if (!cityRef || !cacheKey) return;
    if (branchCache.has(cacheKey)) return;

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      const branches = await getWarehouses(cityRef, q, controller.signal);
      if (controller.signal.aborted) return;
      branchCache.set(cacheKey, branches);
      bump((n) => n + 1);
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [cityRef, q, cacheKey]);

  if (!cityRef || !cacheKey) return { data: [], isLoading: false };
  const cached = branchCache.get(cacheKey);
  if (cached) return { data: cached, isLoading: false };
  return { data: [], isLoading: true };
}
