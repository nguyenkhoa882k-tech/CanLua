import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

/**
 * Hook to automatically fetch settings on mount
 */
export const useSettings = () => {
  const {
    settings,
    loading,
    error,
    autoBackup,
    fourDigitInput,
    fetchSettings,
    updateSetting,
    toggleAutoBackup,
    toggleFourDigitInput,
  } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    settings,
    loading,
    error,
    autoBackup,
    fourDigitInput,
    refresh: fetchSettings,
    updateSetting,
    toggleAutoBackup,
    toggleFourDigitInput,
  };
};

/**
 * Hook to get digit divisor based on fourDigitInput setting
 */
export const useDigitDivisor = () => {
  const { fourDigitInput, getDigitDivisor } = useSettingsStore();

  return {
    fourDigitInput,
    divisor: getDigitDivisor(),
  };
};

/**
 * Hook for generic setting value operations
 */
export const useSettingValue = () => {
  const { getSettingValue, setSettingValue } = useSettingsStore();

  return {
    getValue: getSettingValue,
    setValue: setSettingValue,
  };
};
