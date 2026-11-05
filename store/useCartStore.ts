import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  kitchenDept: 'chicken' | 'pizza' | 'drinks' | 'general';
  imageUrl?: string;
}

export type OrderType = 'delivery' | 'pickup';

export interface CheckoutDetails {
  customerName: string;
  customerPhone: string;
  preferredDate: string;
  preferredTime: string;
  estate: string;
  landmark: string;
  building: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
}

interface BranchSelection {
  id: string;
  name: string;
  phonePrimary: string;
  phoneChicken?: string;
  phonePizza?: string;
  isDeliverable: boolean;
}

interface CartState {
  items: CartItem[];
  orderType: OrderType;
  checkoutDetails: CheckoutDetails | null;
  selectedBranch: BranchSelection | null;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  isDrawerOpen: boolean;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  setOrderType: (type: OrderType) => void;
  setCheckoutDetails: (details: CheckoutDetails) => void;
  setSelectedBranch: (branch: BranchSelection | null) => void;
  setDrawerOpen: (isOpen: boolean) => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getFreeDeliveryProgress: () => { amountRemaining: number; percentage: number };
  getTotalItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'delivery',
      checkoutDetails: null,
      selectedBranch: null,
      deliveryFee: 150,
      freeDeliveryThreshold: 2000,
      isDrawerOpen: false,

      addItem: (newItem) => {
        const compositeId = `${newItem.menuItemId}-${newItem.variantName || 'standard'}`;
        const existingIndex = get().items.findIndex((i) => i.id === compositeId);

        if (existingIndex > -1) {
          const updatedItems = [...get().items];
          updatedItems[existingIndex].quantity += newItem.quantity;
          set({ items: updatedItems, isDrawerOpen: true });
        } else {
          set({
            items: [...get().items, { ...newItem, id: compositeId }],
            isDrawerOpen: true,
          });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      updateQuantity: (id, delta) => {
        const updated = get().items
          .map((item) => {
            if (item.id === id) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[];
        set({ items: updated });
      },

      clearCart: () => set({ items: [] }),
      setOrderType: (type) => set({ orderType: type }),
      setCheckoutDetails: (details) => set({ checkoutDetails: details }),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),

      getSubtotal: () => {
        return get().items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        if (get().orderType === 'pickup') return subtotal;
        const fee = subtotal >= get().freeDeliveryThreshold ? 0 : get().deliveryFee;
        return subtotal + fee;
      },

      getFreeDeliveryProgress: () => {
        const subtotal = get().getSubtotal();
        const threshold = get().freeDeliveryThreshold;
        const remaining = Math.max(0, threshold - subtotal);
        const percentage = Math.min(100, Math.round((subtotal / threshold) * 100));
        return { amountRemaining: remaining, percentage };
      },

      getTotalItemCount: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },
    }),
    {
      name: 'starlight-cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        orderType: state.orderType,
        checkoutDetails: state.checkoutDetails,
        selectedBranch: state.selectedBranch,
      }),
    }
  )
);
