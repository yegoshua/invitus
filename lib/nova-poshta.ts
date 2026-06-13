// All requests go through our own /api/nova-poshta proxy so we (a) bypass
// NP's anti-bot block on direct browser fetches and (b) keep the key on the
// server. The proxy reads NOVA_POSHTA_API_KEY from server env.
const PROXY_URL = "/api/nova-poshta";

export interface NpCity {
  ref: string;
  name: string;
  areaDescription: string;
}

export interface NpWarehouse {
  ref: string;
  description: string;
  number: string;
  type: "branch" | "poshtomat";
}

interface NpResponse<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
  info: string[];
}

async function npRequest<T>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown>,
  signal?: AbortSignal
): Promise<T[]> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelName, calledMethod, methodProperties }),
    signal,
  });

  if (!res.ok) throw new Error(`Nova Poshta proxy failed: ${res.status}`);

  const json = (await res.json()) as NpResponse<T>;
  if (!json.success) {
    const msg = json.errors?.join("; ") || "Nova Poshta returned success=false";
    if (msg.includes("not configured")) {
      console.warn("[Nova Poshta] " + msg);
      return [];
    }
    throw new Error(msg);
  }
  return json.data;
}

interface SettlementSearchAddressItem {
  Present: string;
  MainDescription: string;
  Area: string;
  Ref: string;
  DeliveryCity: string;
}

interface SettlementSearchResponseItem {
  Addresses: SettlementSearchAddressItem[];
}

export async function searchCities(
  query: string,
  signal?: AbortSignal
): Promise<NpCity[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const data = await npRequest<SettlementSearchResponseItem>(
      "Address",
      "searchSettlements",
      { CityName: q, Limit: 20 },
      signal
    );
    const first = data[0];
    if (!first?.Addresses) return [];

    // NP often returns multiple settlement records sharing the same
    // DeliveryCity ref (different districts/villages, same delivery city).
    // Dedupe so React list keys stay unique.
    const seen = new Set<string>();
    const cities: NpCity[] = [];
    for (const a of first.Addresses) {
      if (!a.DeliveryCity || seen.has(a.DeliveryCity)) continue;
      seen.add(a.DeliveryCity);
      cities.push({
        ref: a.DeliveryCity,
        name: a.MainDescription,
        areaDescription: a.Area ? `${a.Area} обл.` : "",
      });
    }
    return cities;
  } catch (err) {
    if ((err as Error).name === "AbortError") return [];
    console.error("[Nova Poshta] searchCities failed:", err);
    return [];
  }
}

interface WarehouseRaw {
  Ref: string;
  Description: string;
  Number: string;
  CategoryOfWarehouse: string;
}

export async function getWarehouses(
  cityRef: string,
  query = "",
  signal?: AbortSignal
): Promise<NpWarehouse[]> {
  if (!cityRef) return [];

  try {
    const props: Record<string, unknown> = {
      CityRef: cityRef,
      Limit: 50,
      Page: 1,
    };
    const q = query.trim();
    if (q) props.FindByString = q;

    const data = await npRequest<WarehouseRaw>(
      "AddressGeneral",
      "getWarehouses",
      props,
      signal
    );
    const seen = new Set<string>();
    const warehouses: NpWarehouse[] = [];
    for (const w of data) {
      if (!w.Ref || seen.has(w.Ref)) continue;
      seen.add(w.Ref);
      warehouses.push({
        ref: w.Ref,
        description: w.Description,
        number: w.Number,
        type: w.CategoryOfWarehouse === "Postomat" ? "poshtomat" : "branch",
      });
    }
    return warehouses;
  } catch (err) {
    if ((err as Error).name === "AbortError") return [];
    console.error("[Nova Poshta] getWarehouses failed:", err);
    return [];
  }
}
