// Filter module.
//
// Single owner of: filter URL contract, "all" sentinel, slug ↔ active-state.
// Anywhere we read/write filter state, we go through this module — never
// hardcode "filter" param name or "all" string.

import type { FilterTag } from "@/types";

export const FILTER_PARAM = "filter";
export const ALL_FILTER_SLUG = "all";

export const ALL_FILTER: FilterTag = { slug: ALL_FILTER_SLUG, label: "УСІ" };

export function isAllFilter(slug: string | undefined | null): boolean {
  return !slug || slug === ALL_FILTER_SLUG;
}

// Server-side: read active filter from a Next.js searchParams object.
export function readFilterFromSearchParams(searchParams: {
  [key: string]: string | string[] | undefined;
}): string {
  const value = searchParams[FILTER_PARAM];
  if (Array.isArray(value)) return value[0] ?? ALL_FILTER_SLUG;
  return value ?? ALL_FILTER_SLUG;
}
