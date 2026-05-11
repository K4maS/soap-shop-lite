import { create } from 'zustand';
import type { Product } from '../api';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  add: (product: Product, quantity?: number) => void;
  remove: (productId: string) => void;
  update: (productId: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

const load = (): CartItem[] => {
  try {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  } catch {
    return [];
  }
};

const save = (items: CartItem[]) =>
  localStorage.setItem('cart', JSON.stringify(items));

export const useCartStore = create<CartStore>((set, get) => ({
  items: load(),

  add: (product, quantity = 1) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === product.id);
    let next: CartItem[];
    if (existing) {
      next = items.map((i) =>
        i.product.id === product.id
          ? { ...i, quantity: i.quantity + quantity }
          : i,
      );
    } else {
      next = [...items, { product, quantity }];
    }
    save(next);
    set({ items: next });
  },

  remove: (productId) => {
    const next = get().items.filter((i) => i.product.id !== productId);
    save(next);
    set({ items: next });
  },

  update: (productId, quantity) => {
    if (quantity <= 0) {
      get().remove(productId);
      return;
    }
    const next = get().items.map((i) =>
      i.product.id === productId ? { ...i, quantity } : i,
    );
    save(next);
    set({ items: next });
  },

  clear: () => {
    localStorage.removeItem('cart');
    set({ items: [] });
  },

  total: () =>
    get().items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0),

  count: () =>
    get().items.reduce((s, i) => s + i.quantity, 0),
}));
