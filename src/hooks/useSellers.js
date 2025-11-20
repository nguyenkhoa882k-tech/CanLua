import { useSettingsStore } from '../stores/useSettingsStore';
import { useSellerStore } from '../stores/useSellerStore';
import { useEffect } from 'react';

/**
 * Hook to manage sellers for a specific buyer
 */
export const useSellers = buyerId => {
  const {
    sellers,
    loading,
    error,
    fetchSellers,
    addSeller,
    updateSeller,
    removeSeller,
    getSellersByBuyerId,
  } = useSellerStore();

  const { getSettingValue, setSettingValue } = useSettingsStore();

  useEffect(() => {
    if (buyerId) {
      fetchSellers(buyerId, getSettingValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId]);

  return {
    sellers: getSellersByBuyerId(buyerId),
    loading,
    error,
    refresh: () => fetchSellers(buyerId, getSettingValue),
    addSeller: sellerData => addSeller(buyerId, sellerData, setSettingValue),
    updateSeller: (sellerId, updates) =>
      updateSeller(buyerId, sellerId, updates, setSettingValue),
    removeSeller: sellerId => removeSeller(buyerId, sellerId, setSettingValue),
  };
};
