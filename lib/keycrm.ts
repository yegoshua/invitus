// Low-level KeyCRM Open API client.
//
// Server-only: requires KEYCRM_API_TOKEN from .env.local (never expose to the
// client bundle). Rate limit is 60 req/min per key — responses are cached via
// Next.js fetch cache (revalidate) so page renders don't hit the API directly.

import type { KeyCrmPaginated } from "./keycrm-schema";

const KEYCRM_BASE_URL = "https://openapi.keycrm.app/v1";

// KeyCRM caps `limit` at 50 per page.
export const KEYCRM_PAGE_LIMIT = 50;

interface FetchKeyCrmOptions {
  params?: Record<string, string>;
  revalidate?: number;
  tags?: string[];
}

export async function fetchKeyCrm<T>(
  path: string,
  { params, revalidate = 60, tags }: FetchKeyCrmOptions = {}
): Promise<T> {
  const token = process.env.KEYCRM_API_TOKEN;
  if (!token) {
    throw new Error(
      "KEYCRM_API_TOKEN is not set. Add it to .env.local (server-only)."
    );
  }

  const search = params ? `?${new URLSearchParams(params)}` : "";
  const response = await fetch(`${KEYCRM_BASE_URL}${path}${search}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    next: { revalidate, tags },
  });

  if (!response.ok) {
    throw new Error(
      `KeyCRM request failed: ${response.status} ${response.statusText} (${path})`
    );
  }

  return response.json() as Promise<T>;
}

/** Fetch every page of a paginated KeyCRM listing endpoint. */
export async function fetchKeyCrmAll<T>(
  path: string,
  { params, revalidate, tags }: FetchKeyCrmOptions = {}
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  for (;;) {
    const response = await fetchKeyCrm<KeyCrmPaginated<T>>(path, {
      params: {
        ...params,
        limit: String(KEYCRM_PAGE_LIMIT),
        page: String(page),
      },
      revalidate,
      tags,
    });

    items.push(...response.data);
    if (page >= response.last_page || !response.next_page_url) break;
    page += 1;
  }

  return items;
}
