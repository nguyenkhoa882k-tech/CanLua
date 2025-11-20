import { useEffect } from 'react';
import { useTransactionStore } from '../stores/useTransactionStore';

/**
 * Hook to automatically fetch transactions on mount
 */
export const useTransactions = () => {
  const {
    transactions,
    loading,
    error,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    removeTransaction,
  } = useTransactionStore();

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    transactions,
    loading,
    error,
    refresh: fetchTransactions,
    addTransaction,
    updateTransaction,
    removeTransaction,
  };
};

/**
 * Hook to get yearly statistics
 */
export const useYearlyStats = year => {
  const {
    yearlyStats,
    loading,
    error,
    selectedYear,
    fetchYearlyStats,
    setSelectedYear,
  } = useTransactionStore();

  useEffect(() => {
    if (year) {
      fetchYearlyStats(year);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  return {
    stats: yearlyStats,
    loading,
    error,
    selectedYear,
    setYear: setSelectedYear,
    refresh: () => fetchYearlyStats(year || selectedYear),
  };
};

/**
 * Hook to get transactions by date range
 */
export const useTransactionsByDateRange = () => {
  const { fetchTransactionsByDateRange, loading, error } =
    useTransactionStore();

  return {
    fetchByDateRange: fetchTransactionsByDateRange,
    loading,
    error,
  };
};
