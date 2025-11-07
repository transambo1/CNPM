import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  ReactNode,
} from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  img?: string;
  quantity: number;
  restaurantId: string;
};

type CartState = {
  items: CartItem[];
  restaurantId?: string;
};

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { id: string } }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR" };

type CartContextValue = {
  items: CartItem[];
  restaurantId?: string;
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const initialState: CartState = {
  items: [],
  restaurantId: undefined,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { payload } = action;

      if (state.restaurantId && state.restaurantId !== payload.restaurantId) {
        return {
          items: [{ ...payload }],
          restaurantId: payload.restaurantId,
        };
      }

      const nextItems = state.items.some((item) => item.id === payload.id)
        ? state.items.map((item) =>
            item.id === payload.id
              ? { ...item, quantity: item.quantity + payload.quantity }
              : item
          )
        : [...state.items, payload];

      return {
        items: nextItems,
        restaurantId: payload.restaurantId,
      };
    }

    case "REMOVE_ITEM": {
      const filtered = state.items.filter((item) => item.id !== action.payload.id);
      return {
        items: filtered,
        restaurantId: filtered.length > 0 ? state.restaurantId : undefined,
      };
    }

    case "UPDATE_QUANTITY": {
      const { id, quantity } = action.payload;

      if (quantity <= 0) {
        const filtered = state.items.filter((item) => item.id !== id);
        return {
          items: filtered,
          restaurantId: filtered.length > 0 ? state.restaurantId : undefined,
        };
      }

      const updated = state.items.map((item) =>
        item.id === id ? { ...item, quantity } : item
      );

      return {
        ...state,
        items: updated,
      };
    }

    case "CLEAR":
      return initialState;

    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = state.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    const addItem: CartContextValue["addItem"] = (
      item,
      quantity = 1
    ) => {
      if (!item.restaurantId) {
        return;
      }

      dispatch({
        type: "ADD_ITEM",
        payload: { ...item, quantity },
      });
    };

    return {
      items: state.items,
      restaurantId: state.restaurantId,
      totalItems,
      totalPrice,
      addItem,
      removeItem: (id) => dispatch({ type: "REMOVE_ITEM", payload: { id } }),
      updateQuantity: (id, quantity) =>
        dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } }),
      clearCart: () => dispatch({ type: "CLEAR" }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart phải được sử dụng bên trong CartProvider");
  }

  return context;
}
