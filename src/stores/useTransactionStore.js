import { create } from 'zustand';
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByDateRange,
  getTransactionStats,
} from '../services/transactions';

export const useTransactionStore = create((set, get) => ({
  // State
  transactions: [],
  loading: false,
  error: null,
  yearlyStats: null,
  selectedYear: new Date().getFullYear(),

  // Actions
  fetchTransactions: async () => {
    set({ loading: true, error: null });
    try {
      const transactions = await listTransactions();
      set({ transactions, loading: false });
      return transactions;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addTransaction: async transactionData => {
    set({ loading: true, error: null });
    try {
      const newTransaction = await createTransaction(transactionData);
      set(state => ({
        transactions: [newTransaction, ...state.transactions],
        loading: false,
      }));
      // Refresh stats if needed
      if (newTransaction.date.includes(get().selectedYear)) {
        get().fetchYearlyStats(get().selectedYear);
      }
      return newTransaction;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateTransaction: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateTransaction(id, updates);
      set(state => ({
        transactions: state.transactions.map(t => (t.id === id ? updated : t)),
        loading: false,
      }));
      // Refresh stats
      get().fetchYearlyStats(get().selectedYear);
      return updated;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  removeTransaction: async id => {
    set({ loading: true, error: null });
    try {
      await deleteTransaction(id);
      set(state => ({
        transactions: state.transactions.filter(t => t.id !== id),
        loading: false,
      }));
      // Refresh stats
      get().fetchYearlyStats(get().selectedYear);
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchTransactionsByDateRange: async (startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const transactions = await getTransactionsByDateRange(startDate, endDate);
      set({ loading: false });
      return transactions;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchYearlyStats: async year => {
    set({ loading: true, error: null, selectedYear: year });
    try {
      const stats = await getTransactionStats(year);
      set({ yearlyStats: stats, loading: false });
      return stats;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  setSelectedYear: year => {
    set({ selectedYear: year });
    get().fetchYearlyStats(year);
  },

  // Selectors
  getTransactionsByType: type => {
    return get().transactions.filter(t => t.type === type);
  },

  getIncomeTransactions: () => {
    return get().transactions.filter(t => t.type === 'income');
  },

  getExpenseTransactions: () => {
    return get().transactions.filter(t => t.type === 'expense');
  },

  getTotalIncome: () => {
    return get()
      .transactions.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  },

  getTotalExpense: () => {
    return get()
      .transactions.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  },

  getProfit: () => {
    return get().getTotalIncome() - get().getTotalExpense();
  },
}));
