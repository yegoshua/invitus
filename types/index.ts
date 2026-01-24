export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: { url: string; alt: string }[];
  category?: string;
  description?: string;
  sizes?: string[];
}

export interface CartItem extends Product {
  quantity: number;
  size?: string;
}

export interface CartState {
  items: CartItem[];
  addItem: (product: Product, size?: string) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}
