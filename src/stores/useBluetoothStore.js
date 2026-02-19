import { create } from 'zustand';
import BluetoothService from '../services/bluetooth';

export const useBluetoothStore = create((set, get) => ({
  // State
  isEnabled: false,
  isScanning: false,
  isConnected: false,
  devices: [], // Ensure this is always an array
  connectedDevice: null,
  currentWeight: null,
  error: null,

  // Actions
  setEnabled: enabled => set({ isEnabled: enabled }),

  scanDevices: async () => {
    set({ isScanning: true, error: null, devices: [] });
    try {
      const devices = await BluetoothService.scanDevices(5000);

      // Ensure devices is an array
      const deviceArray = Array.isArray(devices) ? devices : [];

      console.log('📱 Store received devices:', deviceArray);
      set({ devices: deviceArray, isScanning: false });
      return deviceArray;
    } catch (error) {
      console.error('❌ Store scan error:', error);
      set({
        error: error.message || 'Lỗi không xác định khi quét Bluetooth',
        isScanning: false,
        devices: [],
      });
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
