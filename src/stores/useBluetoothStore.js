import { create } from 'zustand';
import BluetoothService from '../services/bluetooth';

export const useBluetoothStore = create((set, get) => ({
  // State
  isEnabled: false,
  isScanning: false,
  isConnected: false,
  devices: [],
  connectedDevice: null,
  currentWeight: null,
  error: null,

  // Actions
  setEnabled: enabled => set({ isEnabled: enabled }),

  scanDevices: async () => {
    set({ isScanning: true, error: null });
    try {
      const devices = await BluetoothService.scanDevices(5000);
      set({ devices, isScanning: false });
      return devices;
    } catch (error) {
      set({ error: error.message, isScanning: false });
      throw error;
    }
  },

  connectDevice: async deviceId => {
    set({ error: null });
    try {
      await BluetoothService.connect(deviceId);
      const device = get().devices.find(d => d.id === deviceId);
      set({
        isConnected: true,
        connectedDevice: device,
      });

      // Setup weight listener
      BluetoothService.onWeightUpdate(weight => {
        set({ currentWeight: weight });
      });

      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  disconnectDevice: async () => {
    try {
      await BluetoothService.disconnect();
      set({
        isConnected: false,
        connectedDevice: null,
        currentWeight: null,
      });
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  clearWeight: () => set({ currentWeight: null }),

  clearError: () => set({ error: null }),
}));
