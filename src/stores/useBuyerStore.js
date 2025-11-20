import { create } from 'zustand';
import {
  listBuyers,
  createBuyer,
  updateBuyer,
  deleteBuyer,
  getBuyer,
} from '../services/buyers';

export const useBuyerStore = create((set, get) => ({
  // State
  buyers: [],
  loading: false,
  error: null,
  selectedBuyer: null,

  // Actions
  fetchBuyers: async () => {
    set({ loading: true, error: null });
    try {
      const buyers = await listBuyers();
      set({ buyers, loading: false });
      return buyers;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addBuyer: async buyerData => {
    set({ loading: true, error: null });
    try {
      const newBuyer = await createBuyer(buyerData);
      set(state => ({
        buyers: [newBuyer, ...state.buyers],
        loading: false,
      }));
      return newBuyer;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateBuyer: async buyerData => {
    set({ loading: true, error: null });
    try {
      const updated = await updateBuyer(buyerData);
      set(state => ({
        buyers: state.buyers.map(b => (b.id === updated.id ? updated : b)),
        loading: false,
      }));
      return updated;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  removeBuyer: async buyerId => {
    set({ loading: true, error: null });
    try {
      await deleteBuyer(buyerId);
      set(state => ({
        buyers: state.buyers.filter(b => b.id !== buyerId),
        loading: false,
      }));
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  selectBuyer: async buyerId => {
    set({ loading: true, error: null });
    try {
      const buyer = await getBuyer(buyerId);
      set({ selectedBuyer: buyer, loading: false });
      return buyer;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearSelectedBuyer: () => {
    set({ selectedBuyer: null });
  },

  // Selectors
  getBuyerById: buyerId => {
    return get().buyers.find(b => b.id === buyerId);
  },

  getTotalBuyers: () => {
    return get().buyers.length;
  },
}));
