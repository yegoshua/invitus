// Nova Poshta waybills (ТТН), created from the «🚚 Створити ТТН» button.
// Server-only.
//
// The waybill is made from the account NOVA_POSHTA_API_KEY belongs to — the
// same key the checkout's city and branch search uses — so that key must be
// the shop's sending account. The sender (counterparty and contact person) is
// read from that account rather than configured, because it is whatever the
// account says it is; only the branch parcels are handed in at has to be named,
// since an account can send from anywhere.
//
// Env (server-only):
//   NOVA_POSHTA_API_KEY               the sending account's key
//   NOVA_POSHTA_SENDER_WAREHOUSE_REF  Ref of the branch parcels are handed in at
//   NOVA_POSHTA_PARCEL_WEIGHT         optional, kg, default 1
//   NOVA_POSHTA_CARGO_DESCRIPTION     optional, default «Спортивне спорядження»
//
// Who pays: the recipient, always — the site charges nothing for delivery
// (issue #31), so the customer pays Nova Poshta on collection. Cash on delivery
// adds a money transfer back for the goods.

const NP_URL = "https://api.novaposhta.ua/v2.0/json/";
const NP_TIMEOUT_MS = 10_000;

export class WaybillError extends Error {}

interface NpResponse<T> {
  success: boolean;
  data: T[];
  errors?: string[];
  warnings?: string[];
}

function apiKey(): string {
  const key = process.env.NOVA_POSHTA_API_KEY || process.env.NEXT_PUBLIC_NOVA_POSHTA_API_KEY;
  if (!key) throw new WaybillError("NOVA_POSHTA_API_KEY не налаштовано");
  return key;
}

async function np<T>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown>
): Promise<T[]> {
  let res: Response;
  try {
    res = await fetch(NP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKey(), modelName, calledMethod, methodProperties }),
      signal: AbortSignal.timeout(NP_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    throw new WaybillError(
      `Нова Пошта не відповідає (${err instanceof Error ? err.message : String(err)})`
    );
  }
  if (!res.ok) throw new WaybillError(`Нова Пошта: HTTP ${res.status}`);
  const body = (await res.json()) as NpResponse<T>;
  if (!body.success) {
    // NP's own wording is what the manager needs — «RecipientsPhone is
    // invalid» says exactly what to fix in the order.
    throw new WaybillError(`Нова Пошта: ${(body.errors ?? []).join("; ") || "невідома помилка"}`);
  }
  return body.data;
}

// --- Pure: what goes into the request ---------------------------------------

export interface WaybillSender {
  counterpartyRef: string;
  contactRef: string;
  phone: string;
  cityRef: string;
  warehouseRef: string;
}

export interface WaybillOrder {
  orderId: number;
  fullName: string;
  phone: string;
  cityRef: string;
  warehouseRef: string;
  /** What the goods are worth — the declared value, and the COD amount. */
  total: number;
  cashOnDelivery: boolean;
}

/**
 * The checkout asks for «ім'я та прізвище» in one field, in that order, so the
 * first word is the first name and the rest is the surname. One word is not
 * enough for Nova Poshta, and guessing a surname would put a parcel under a
 * name the customer cannot show ID for.
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    throw new WaybillError(`Потрібні ім'я та прізвище одержувача, а в замовленні «${fullName.trim()}»`);
  }
  return { firstName: words[0], lastName: words.slice(1).join(" ") };
}

/** Nova Poshta wants 380XXXXXXXXX — no plus, no spaces. */
export function npPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `38${digits}`;
  return digits;
}

/** dd.mm.yyyy in Kyiv — the server is UTC, and a parcel made at 01:00 is today's. */
export function npDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Kyiv",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);
  return parts.replace(/\//g, ".");
}

export function buildWaybillRequest(params: {
  order: WaybillOrder;
  sender: WaybillSender;
  recipient: { counterpartyRef: string; contactRef: string };
  weightKg: number;
  description: string;
  now?: Date;
}): Record<string, unknown> {
  const { order, sender, recipient } = params;
  return {
    PayerType: "Recipient",
    PaymentMethod: "Cash",
    DateTime: npDate(params.now),
    CargoType: "Parcel",
    Weight: String(params.weightKg),
    ServiceType: "WarehouseWarehouse",
    SeatsAmount: "1",
    Description: params.description,
    Cost: String(Math.max(1, Math.round(order.total))),
    InfoRegClientBarcodes: String(order.orderId),
    CitySender: sender.cityRef,
    Sender: sender.counterpartyRef,
    SenderAddress: sender.warehouseRef,
    ContactSender: sender.contactRef,
    SendersPhone: sender.phone,
    CityRecipient: order.cityRef,
    Recipient: recipient.counterpartyRef,
    RecipientAddress: order.warehouseRef,
    ContactRecipient: recipient.contactRef,
    RecipientsPhone: npPhone(order.phone),
    ...(order.cashOnDelivery
      ? {
          BackwardDeliveryData: [
            {
              PayerType: "Recipient",
              CargoType: "Money",
              RedeliveryString: String(Math.round(order.total)),
            },
          ],
        }
      : {}),
  };
}

// --- Impure: talking to Nova Poshta -----------------------------------------

let senderCache: WaybillSender | null = null;

async function sender(): Promise<WaybillSender> {
  if (senderCache) return senderCache;

  const warehouseRef = process.env.NOVA_POSHTA_SENDER_WAREHOUSE_REF;
  if (!warehouseRef) {
    throw new WaybillError("Не вказано відділення відправки (NOVA_POSHTA_SENDER_WAREHOUSE_REF)");
  }

  const [counterparties, warehouses] = await Promise.all([
    np<{ Ref: string }>("CounterpartyGeneral", "getCounterparties", {
      CounterpartyProperty: "Sender",
      Page: "1",
    }),
    np<{ Ref: string; CityRef: string }>("AddressGeneral", "getWarehouses", {
      Ref: warehouseRef,
    }),
  ]);
  const counterparty = counterparties[0];
  if (!counterparty) throw new WaybillError("У кабінеті Нової Пошти немає відправника");
  const warehouse = warehouses[0];
  if (!warehouse) throw new WaybillError("Відділення відправки не знайдено в Новій Пошті");

  const contacts = await np<{ Ref: string; Phones?: string }>(
    "CounterpartyGeneral",
    "getCounterpartyContactPersons",
    { Ref: counterparty.Ref, Page: "1" }
  );
  const contact = contacts[0];
  if (!contact?.Phones) throw new WaybillError("У відправника немає контактної особи з телефоном");

  senderCache = {
    counterpartyRef: counterparty.Ref,
    contactRef: contact.Ref,
    phone: npPhone(contact.Phones),
    cityRef: warehouse.CityRef,
    warehouseRef,
  };
  return senderCache;
}

async function recipient(order: WaybillOrder) {
  const { firstName, lastName } = splitName(order.fullName);
  const [created] = await np<{ Ref: string; ContactPerson?: { data?: Array<{ Ref: string }> } }>(
    "Counterparty",
    "save",
    {
      FirstName: firstName,
      LastName: lastName,
      MiddleName: "",
      Phone: npPhone(order.phone),
      Email: "",
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient",
    }
  );
  const contactRef = created?.ContactPerson?.data?.[0]?.Ref;
  if (!created?.Ref || !contactRef) {
    throw new WaybillError("Нова Пошта не повернула одержувача");
  }
  return { counterpartyRef: created.Ref, contactRef };
}

/** Creates the waybill and returns its number (IntDocNumber). */
export async function createWaybill(order: WaybillOrder): Promise<string> {
  if (!order.cityRef || !order.warehouseRef) {
    throw new WaybillError("У замовленні немає відділення Нової Пошти (city_ref / warehouse_ref)");
  }
  const [from, to] = await Promise.all([sender(), recipient(order)]);
  const weight = Number(process.env.NOVA_POSHTA_PARCEL_WEIGHT) || 1;
  const [doc] = await np<{ IntDocNumber?: string }>(
    "InternetDocument",
    "save",
    buildWaybillRequest({
      order,
      sender: from,
      recipient: to,
      weightKg: weight,
      description: process.env.NOVA_POSHTA_CARGO_DESCRIPTION || "Спортивне спорядження",
    })
  );
  if (!doc?.IntDocNumber) throw new WaybillError("Нова Пошта не повернула номер ТТН");
  return doc.IntDocNumber;
}
