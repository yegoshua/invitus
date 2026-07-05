// KeyCRM Open API response shapes (https://openapi.keycrm.app/v1).
// Only the fields the adapter consumes — the API returns more.

export interface KeyCrmPaginated<T> {
  current_page: number;
  last_page: number;
  next_page_url: string | null;
  total?: number;
  data: T[];
}

export interface KeyCrmProduct {
  id: number;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  attachments_data: string[] | null;
  quantity: number;
  in_reserve: number;
  currency_code: string;
  min_price: number;
  max_price: number;
  has_offers: boolean;
  is_archived: boolean;
  category_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface KeyCrmOfferProperty {
  name: string; // e.g. "Розмір", "Стать"
  value: string; // e.g. "S", "Чоловік"
}

export interface KeyCrmOffer {
  id: number;
  product_id: number;
  sku: string | null;
  price: number;
  quantity: number;
  in_reserve: number;
  thumbnail_url: string | null;
  properties: KeyCrmOfferProperty[];
  is_default: boolean;
  is_archived: boolean;
}

export interface KeyCrmCategory {
  id: number;
  name: string;
  parent_id: number | null;
}
