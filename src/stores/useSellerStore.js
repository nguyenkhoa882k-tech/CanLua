import { create } from 'zustand';

export const useSellerStore = create((set, get) => ({
  // State
  sellers: {},
  loading: false,
  error: null,

  // Actions
  fetchSellers: async (buyerId, getSettingValue) => {
    set({ loading: true, error: null });
    try {
      const sellers = (await getSettingValue(`sellers_${buyerId}`)) || [];
      set(state => ({
        sellers: { ...state.sellers, [buyerId]: sellers },
        loading: false,
      }));
      return sellers;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addSeller: async (buyerId, sellerData, setSettingValue) => {
    set({ loading: true, error: null });
    try {
      const currentSellers = get().sellers[buyerId] || [];
      const newSeller = {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        ...sellerData,
        createdAt: new Date().toISOString(),
      };
      const updated = [newSeller, ...currentSellers];
      await setSettingValue(`sellers_${buyerId}`, updated);
      set(state => ({
        sellers: { ...state.sellers, [buyerId]: updated },
        loading: false,
      }));
      return newSeller;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateSeller: async (buyerId, sellerId, updates, setSettingValue) => {
    set({ loading: true, error: null });
    try {
      const currentSellers = get().sellers[buyerId] || [];
      const updated = currentSellers.map(s =>
        s.id === sellerId ? { ...s, ...updates } : s,
      );
      await setSettingValue(`sellers_${buyerId}`, updated);
      set(state => ({
        sellers: { ...state.sellers, [buyerId]: updated },
        loading: false,
      }));
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  removeSeller: async (buyerId, sellerId, setSettingValue) => {
    set({ loading: true, error: null });
    try {
      const currentSellers = get().sellers[buyerId] || [];
      const updated = currentSellers.filter(s => s.id !== sellerId);
      await setSettingValue(`sellers_${buyerId}`, updated);
      set(state => ({
        sellers: { ...state.sellers, [buyerId]: updated },
        loading: false,
      }));
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Selectors
  getSellersByBuyerId: buyerId => {
    return get().sellers[buyerId] || [];
  },

  getSellerById: (buyerId, sellerId) => {
    const sellers = get().sellers[buyerId] || [];
    return sellers.find(s => s.id === sellerId);
  },
}));
