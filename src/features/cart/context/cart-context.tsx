"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  addToCartAction,
  updateCartItemAction,
  removeCartItemAction,
  getActiveCartAction,
} from "@/features/cart/actions/cart";
import type { Cart } from "@/features/cart/types";

interface CartContextValue {
  cart: Cart | null;
  isOpen: boolean;
  isPending: boolean;
  pendingItemId: string | null;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  clearError: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  initialCart = null,
}: {
  children: ReactNode;
  initialCart?: Cart | null;
}) {
  const [cart, setCart] = useState<Cart | null>(initialCart);
  const [prevInitialCart, setPrevInitialCart] = useState<Cart | null>(initialCart);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Adjust state during render when initialCart changes from server transitions
  if (initialCart !== prevInitialCart) {
    setPrevInitialCart(initialCart);
    if (initialCart && initialCart.items.length > 0) {
      setCart((current) => (current && current.items.length > 0 ? current : initialCart));
    }
  }

  const clearError = useCallback(() => setError(null), []);

  const refreshCart = useCallback(async () => {
    try {
      const latest = await getActiveCartAction();
      setCart(latest);
    } catch (err) {
      console.error("Failed to refresh cart", err);
    }
  }, []);

  const openCart = useCallback(() => {
    setIsOpen(true);
    refreshCart();
  }, [refreshCart]);

  const closeCart = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  const toggleCart = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const addItem = useCallback(
    async (variantId: string, quantity = 1): Promise<boolean> => {
      setError(null);
      setPendingItemId(variantId);

      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            const result = await addToCartAction(variantId, quantity);
            if (result.ok) {
              if (!result.data.cart || result.data.cart.items.length === 0) {
                setError("Unable to add this perfume to your bag. Please try again.");
                resolve(false);
                return;
              }
              setCart(result.data.cart);
              setIsOpen(true);
              resolve(true);
            } else {
              setError(result.message || "Unable to add this perfume to your bag. Please try again.");
              resolve(false);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to add this perfume to your bag. Please try again.";
            setError(message);
            resolve(false);
          } finally {
            setPendingItemId(null);
          }
        });
      });
    },
    [],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number): Promise<boolean> => {
      setError(null);
      setPendingItemId(itemId);

      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            const result = await updateCartItemAction(itemId, quantity);
            if (result.ok) {
              setCart(result.data.cart);
              resolve(true);
            } else {
              setError(result.message);
              resolve(false);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to update quantity.";
            setError(message);
            resolve(false);
          } finally {
            setPendingItemId(null);
          }
        });
      });
    },
    [],
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      setError(null);
      setPendingItemId(itemId);

      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            const result = await removeCartItemAction(itemId);
            if (result.ok) {
              setCart(result.data.cart);
              resolve(true);
            } else {
              setError(result.message);
              resolve(false);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to remove item.";
            setError(message);
            resolve(false);
          } finally {
            setPendingItemId(null);
          }
        });
      });
    },
    [],
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        isPending,
        pendingItemId,
        error,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        updateQuantity,
        removeItem,
        clearError,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
