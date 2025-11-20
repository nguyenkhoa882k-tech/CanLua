import { create } from 'zustand';
import {
  getSettings,
  saveSettings,
  updateSetting,
  getSetting,
  getSettingValue,
  setSettingValue,
} from '../services/settings';

export const useSettingsStore = create((set, get) => ({
  // State
  settings: {},
  loading: false,
  error: null,
  autoBackup: false,
  fourDigitInput: false,

  // Actions
  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getSettings();
      set({
        settings,
        autoBackup: settings.autoBackup ?? false,
        fourDigitInput: settings.fourDigitInput ?? false,
        loading: false,
      });
      return settings;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  saveSettings: async newSettings => {
    set({ loading: true, error: null });
    try {
      await saveSettings(newSettings);
      set({
        settings: newSettings,
        autoBackup: newSettings.autoBackup ?? false,
        fourDigitInput: newSettings.fourDigitInput ?? false,
        loading: false,
      });
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateSetting: async (key, value) => {
    set({ loading: true, error: null });
    try {
      await updateSetting(key, value);
      set(state => ({
        settings: { ...state.settings, [key]: value },
        [key]: value,
        loading: false,
      }));
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  getSetting: async (key, defaultValue = null) => {
    try {
      const value = await getSetting(key, defaultValue);
      return value;
    } catch (error) {
      console.error('Error getting setting:', error);
      return defaultValue;
    }
  },

  toggleAutoBackup: async () => {
    const newValue = !get().autoBackup;
    await get().updateSetting('autoBackup', newValue);
  },

  toggleFourDigitInput: async () => {
    const newValue = !get().fourDigitInput;
    await get().updateSetting('fourDigitInput', newValue);
  },

  // Generic setting value storage (for sellers, weighings, etc.)
  getSettingValue: async key => {
    try {
      const value = await getSettingValue(key);
      return value;
    } catch (error) {
      console.error('Error getting setting value:', error);
      return null;
    }
  },

  setSettingValue: async (key, value) => {
    try {
      await setSettingValue(key, value);
      return true;
    } catch (error) {
      console.error('Error setting value:', error);
      return false;
    }
  },

  // Selectors
  getAutoBackup: () => get().autoBackup,
  getFourDigitInput: () => get().fourDigitInput,
  getDigitDivisor: () => (get().fourDigitInput ? 100 : 10),
}));
