import { useSettingsStore } from '../stores/useSettingsStore';
import { useWeighingStore } from '../stores/useWeighingStore';
import { useEffect } from 'react';

/**
 * Hook to manage weighing data for a specific buyer-seller pair
 */
export const useWeighing = (buyerId, sellerId) => {
  const {
    loading,
    error,
    fetchWeighing,
    saveWeighing,
    updateWeighing,
    confirmWeighing,
    getWeighing,
    isWeighingConfirmed,
  } = useWeighingStore();

  const { getSettingValue, setSettingValue } = useSettingsStore();

  useEffect(() => {
    if (buyerId && sellerId) {
      fetchWeighing(buyerId, sellerId, getSettingValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId, sellerId]);

  return {
    weighing: getWeighing(buyerId, sellerId),
    loading,
    error,
    isConfirmed: isWeighingConfirmed(buyerId, sellerId),
    refresh: () => fetchWeighing(buyerId, sellerId, getSettingValue),
    save: weighingData =>
      saveWeighing(buyerId, sellerId, weighingData, setSettingValue),
    update: updates =>
      updateWeighing(buyerId, sellerId, updates, setSettingValue),
    confirm: () => confirmWeighing(buyerId, sellerId, setSettingValue),
  };
};
