import { create } from 'zustand';

export const useWeighingStore = create((set, get) => ({
  // State
  weighings: {},
  loading: false,
  error: null,

  // Actions
  fetchWeighing: async (buyerId, sellerId, getSettingValue) => {
    set({ loading: true, error: null });
    try {
      const key = `weighing_${buyerId}_${sellerId}`;
      const weighing = await getSettingValue(key);
      const storeKey = `${buyerId}_${sellerId}`;
      set(state => ({
        weighings: { ...state.weighings, [storeKey]: weighing },
        loading: false,
      }));
      return weighing;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  saveWeighing: async (buyerId, sellerId, weighingData, setSettingValue) => {
    set({ loading: true, error: null });
    try {
      const key = `weighing_${buyerId}_${sellerId}`;
      await setSettingValue(key, weighingData);
      const storeKey = `${buyerId}_${sellerId}`;
      set(state => ({
        weighings: { ...state.weighings, [storeKey]: weighingData },
        loading: false,
      }));
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateWeighing: async (buyerId, sellerId, updates, setSettingValue) => {
    set({ loading: true, error: null });
    try {
      const key = `weighing_${buyerId}_${sellerId}`;
      const storeKey = `${buyerId}_${sellerId}`;
      const current = get().weighings[storeKey] || {};
      const updated = { ...current, ...updates };
      await setSettingValue(key, updated);
      set(state => ({
        weighings: { ...state.weighings, [storeKey]: updated },
        loading: false,
      }));
      return updated;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  confirmWeighing: async (buyerId, sellerId, setSettingValue) => {
    const storeKey = `${buyerId}_${sellerId}`;
    const weighing = get().weighings[storeKey];
    if (weighing) {
      return await get().updateWeighing(
        buyerId,
        sellerId,
        { ...weighing, confirmed: true, updatedAt: new Date().toISOString() },
        setSettingValue,
      );
    }
    return false;
  },

  clearWeighing: (buyerId, sellerId) => {
    const storeKey = `${buyerId}_${sellerId}`;
    set(state => {
      const newWeighings = { ...state.weighings };
      delete newWeighings[storeKey];
      return { weighings: newWeighings };
    });
  },

  // Selectors
  getWeighing: (buyerId, sellerId) => {
    const storeKey = `${buyerId}_${sellerId}`;
    return get().weighings[storeKey];
  },

  isWeighingConfirmed: (buyerId, sellerId) => {
    const weighing = get().getWeighing(buyerId, sellerId);
    return weighing?.confirmed || false;
  },
}));
