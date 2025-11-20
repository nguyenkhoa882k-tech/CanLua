import { useEffect } from 'react';
import { useBuyerStore } from '../stores/useBuyerStore';

/**
 * Hook to automatically fetch buyers on mount
 */
export const useBuyers = () => {
  const {
    buyers,
    loading,
    error,
    fetchBuyers,
    addBuyer,
    updateBuyer,
    removeBuyer,
  } = useBuyerStore();

  useEffect(() => {
    fetchBuyers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    buyers,
    loading,
    error,
    refresh: fetchBuyers,
    addBuyer,
    updateBuyer,
    removeBuyer,
  };
};

/**
 * Hook to get a specific buyer
 */
export const useBuyer = buyerId => {
  const { selectedBuyer, loading, error, selectBuyer, clearSelectedBuyer } =
    useBuyerStore();

  useEffect(() => {
    if (buyerId) {
      selectBuyer(buyerId);
    }
    return () => clearSelectedBuyer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId]);

  return {
    buyer: selectedBuyer,
    loading,
    error,
    refresh: () => selectBuyer(buyerId),
  };
};
