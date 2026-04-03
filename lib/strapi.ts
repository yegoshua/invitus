const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

export async function fetchStrapi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (STRAPI_API_TOKEN) {
    defaultHeaders["Authorization"] = `Bearer ${STRAPI_API_TOKEN}`;
  }

  const mergedOptions: FetchOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const url = `${STRAPI_URL}/api${endpoint}`;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, mergedOptions);

      if (response.status >= 500 && attempt < maxRetries) {
        console.warn(`Strapi ${response.status} on attempt ${attempt}/${maxRetries}, retrying...`);
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`Strapi API error: ${response.status} ${response.statusText}`);
        console.error(`URL: ${url}`);
        console.error(`Response: ${errorText}`);

        if (response.status === 403) {
          console.error("⚠️  Permission denied. Enable public access in Strapi Admin:");
          console.error("   Settings → Users & Permissions → Roles → Public");
        }

        throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (attempt < maxRetries && !(error instanceof Error && error.message.includes("Failed to fetch"))) {
        console.warn(`Strapi fetch error on attempt ${attempt}/${maxRetries}, retrying...`);
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("⚠️  Cannot connect to Strapi. Is it running at", STRAPI_URL, "?");
      }
      console.error(`Error fetching from Strapi:`, error);
      throw error;
    }
  }

  throw new Error(`Failed to fetch ${endpoint} after ${maxRetries} attempts`);
}

export function getStrapiURL(path = "") {
  return `${STRAPI_URL}${path}`;
}

export function getStrapiMedia(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return `${STRAPI_URL}${url}`;
}
