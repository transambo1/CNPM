import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type CartItem = {
  id: string;
  name: string;
  img: string;
  price: number;
  quantity: number;
  restaurantId: string;
  restaurantName?: string;
};

export type CartSummary = {
  restaurantId: string;
  restaurantName?: string;
  itemCount: number;
  totalPrice: number;
};

export type AddToCartResult =
  | { status: 'added'; restaurantId: string }
  | {
      status: 'conflict';
      restaurantId: string;
      restaurantName?: string;
      activeRestaurantId: string | null;
      activeRestaurantName?: string;
    }
  | { status: 'error'; message: string };

export type CartContextType = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  activeItemCount: number;
  activeRestaurantId: string | null;
  activeRestaurantName?: string;
  cartSummaries: CartSummary[];
  selectCart: (restaurantId: string) => void;
  addToCart: (
    item: Omit<CartItem, 'quantity'>,
    quantity?: number,
    options?: { restaurantName?: string; allowCreateNewCart?: boolean }
  ) => AddToCartResult;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: (restaurantId?: string) => void;
  clearAll: () => void;
};

type CartStore = Record<string, { restaurantId: string; restaurantName?: string; items: CartItem[] }>;

const CartContext = createContext<CartContextType | undefined>(undefined);

const sanitizeCarts = (store: CartStore): CartStore => {
  const next: CartStore = {};
  Object.values(store).forEach((cart) => {
    if (cart.items.length > 0) {
      next[cart.restaurantId] = cart;
    }
  });
  return next;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [carts, setCarts] = useState<CartStore>({});
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    const activeCart = activeRestaurantId ? carts[activeRestaurantId] : undefined;
    if (activeCart && activeCart.items.length > 0) {
      return;
    }

    const firstCart = Object.values(carts).find((cart) => cart.items.length > 0) ?? null;
    const nextActiveId = firstCart?.restaurantId ?? null;

    if (nextActiveId !== activeRestaurantId) {
      setActiveRestaurantId(nextActiveId);
    }
  }, [carts, activeRestaurantId]);

  const selectCart = useCallback(
    (restaurantId: string) => {
      if (carts[restaurantId]) {
        setActiveRestaurantId(restaurantId);
      }
    },
    [carts]
  );

  const addToCart = useCallback<
    CartContextType['addToCart']
  >(
    (item, quantity = 1, options) => {
      if (!item.restaurantId) {
        return { status: 'error', message: 'Cart item requires restaurantId' };
      }
      if (quantity <= 0) {
        return { status: 'error', message: 'Quantity must be greater than zero' };
      }

      const existingCart = carts[item.restaurantId];
      const activeCart = activeRestaurantId ? carts[activeRestaurantId] : undefined;

      if (
        !existingCart &&
        activeCart &&
        activeCart.items.length > 0 &&
        activeRestaurantId &&
        activeRestaurantId !== item.restaurantId &&
        !options?.allowCreateNewCart
      ) {
        return {
          status: 'conflict',
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName ?? options?.restaurantName,
          activeRestaurantId,
          activeRestaurantName: activeCart.restaurantName,
        };
      }

      setCarts((prev) => {
        const store = { ...prev };
        const current = store[item.restaurantId] ?? {
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName ?? options?.restaurantName,
          items: [] as CartItem[],
        };

        const updatedName = item.restaurantName ?? options?.restaurantName ?? current.restaurantName;
        const itemsList = [...current.items];
        const index = itemsList.findIndex((cartItem) => cartItem.id === item.id);

        if (index >= 0) {
          itemsList[index] = {
            ...itemsList[index],
            quantity: itemsList[index].quantity + quantity,
            restaurantName: updatedName,
          };
        } else {
          itemsList.push({
            ...item,
            quantity,
            restaurantName: updatedName,
          });
        }

        store[item.restaurantId] = {
          restaurantId: item.restaurantId,
          restaurantName: updatedName,
          items: itemsList,
        };

        return sanitizeCarts(store);
      });

      if (activeRestaurantId !== item.restaurantId) {
        setActiveRestaurantId(item.restaurantId);
      }

      return { status: 'added', restaurantId: item.restaurantId };
    },
    [carts, activeRestaurantId]
  );

  const increment = useCallback((id: string) => {
    setCarts((prev) => {
      for (const [key, cart] of Object.entries(prev)) {
        const index = cart.items.findIndex((item) => item.id === id);
        if (index >= 0) {
          const nextItems = cart.items.map((item, idx) =>
            idx === index ? { ...item, quantity: item.quantity + 1 } : item
          );
          const nextStore: CartStore = { ...prev, [key]: { ...cart, items: nextItems } };
          return sanitizeCarts(nextStore);
        }
      }
      return prev;
    });
  }, []);

  const decrement = useCallback((id: string) => {
    setCarts((prev) => {
      for (const [key, cart] of Object.entries(prev)) {
        const index = cart.items.findIndex((item) => item.id === id);
        if (index >= 0) {
          const nextItems = cart.items
            .map((item, idx) =>
              idx === index
                ? { ...item, quantity: Math.max(0, item.quantity - 1) }
                : item
            )
            .filter((item) => item.quantity > 0);

          const nextStore: CartStore = { ...prev };
          if (nextItems.length === 0) {
            delete nextStore[key];
          } else {
            nextStore[key] = { ...cart, items: nextItems };
          }

          return sanitizeCarts(nextStore);
        }
      }
      return prev;
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCarts((prev) => {
      for (const [key, cart] of Object.entries(prev)) {
        const hasItem = cart.items.some((item) => item.id === id);
        if (hasItem) {
          const nextItems = cart.items.filter((item) => item.id !== id);
          const nextStore: CartStore = { ...prev };
          if (nextItems.length === 0) {
            delete nextStore[key];
          } else {
            nextStore[key] = { ...cart, items: nextItems };
          }
          return sanitizeCarts(nextStore);
        }
      }
      return prev;
    });
  }, []);

  const clearCart = useCallback(
    (restaurantId?: string) => {
      const targetId = restaurantId ?? activeRestaurantId;
      if (!targetId) return;

      setCarts((prev) => {
        if (!prev[targetId]) return prev;
        const store: CartStore = { ...prev };
        delete store[targetId];
        return sanitizeCarts(store);
      });
    },
    [activeRestaurantId]
  );

  const clearAll = useCallback(() => {
    setCarts({});
    setActiveRestaurantId(null);
  }, []);

  const activeCart = activeRestaurantId ? carts[activeRestaurantId] : undefined;
  const items = activeCart?.items ?? [];

  const activeItemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const totalItems = useMemo(() => {
    return Object.values(carts).reduce(
      (acc, cart) => acc + cart.items.reduce((sum, item) => sum + item.quantity, 0),
      0
    );
  }, [carts]);

  const cartSummaries = useMemo<CartSummary[]>(() => {
    return Object.values(carts).map((cart) => ({
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }));
  }, [carts]);

  const value = useMemo(
    () => ({
      items,
      totalItems,
      totalPrice,
      activeItemCount,
      activeRestaurantId,
      activeRestaurantName: activeCart?.restaurantName,
      cartSummaries,
      selectCart,
      addToCart,
      increment,
      decrement,
      removeFromCart,
      clearCart,
      clearAll,
    }),
    [
      items,
      totalItems,
      totalPrice,
      activeItemCount,
      activeRestaurantId,
      activeCart?.restaurantName,
      cartSummaries,
      selectCart,
      addToCart,
      increment,
      decrement,
      removeFromCart,
      clearCart,
      clearAll,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
