import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useBluetoothStore } from '../stores/useBluetoothStore';

export default function BluetoothModal({ visible, onClose }) {
  const {
    isScanning,
    isConnected,
    devices,
    connectedDevice,
    error,
    scanDevices,
    connectDevice,
    disconnectDevice,
    clearError,
  } = useBluetoothStore();

  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (visible && !isConnected) {
      handleScan();
    }
  }, [visible]);

  const handleScan = async () => {
    setLocalError(null);
    clearError();
    try {
      console.log('🔍 Modal: Starting scan...');
      const foundDevices = await scanDevices();
      console.log('✅ Modal: Scan complete, found:', foundDevices?.length || 0);
    } catch (err) {
      console.error('❌ Modal: Scan error:', err);
      const errorMessage =
        err?.message || 'Lỗi không xác định khi quét Bluetooth';
      setLocalError(errorMessage);
    }
  };

  const handleConnect = async deviceId => {
    setLocalError(null);
    clearError();
    try {
      await connectDevice(deviceId);
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectDevice();
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const displayError = error || localError;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          className="bg-white rounded-3xl p-6 w-full max-w-md"
          style={{ maxHeight: '80%' }}
        >
          <Text className="text-2xl font-bold text-gray-800 mb-4 text-center">
            📡 Kết nối Bluetooth
          </Text>

          {/* Connected Device */}
          {isConnected && connectedDevice && (
            <View className="bg-green-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-green-700 font-bold">
                    ✅ Đã kết nối
                  </Text>
                  <Text className="text-green-600 text-sm">
                    {connectedDevice.name || connectedDevice.id}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleDisconnect}
                  className="bg-red-500 px-4 py-2 rounded-xl"
                >
                  <Text className="text-white font-bold">Ngắt</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Error Message */}
          {displayError && (
            <View className="bg-red-50 rounded-xl p-4 mb-4">
              <Text className="text-red-700 font-bold">❌ Lỗi</Text>
              <Text className="text-red-600 text-sm">{displayError}</Text>
            </View>
          )}

          {/* Scan Button */}
          {!isConnected && (
            <TouchableOpacity
              onPress={handleScan}
              disabled={isScanning}
              className={`rounded-xl py-3 mb-4 ${
                isScanning ? 'bg-gray-300' : 'bg-blue-500'
              }`}
            >
              <Text className="text-white text-center font-bold">
                {isScanning ? '🔄 Đang quét...' : '🔍 Quét thiết bị'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Device List */}
          {!isConnected && (
            <View className="flex-1">
              <Text className="text-gray-700 font-semibold mb-2">
                Thiết bị tìm thấy:
              </Text>

              {isScanning ? (
                <View className="items-center py-10">
                  <ActivityIndicator size="large" color="#10b981" />
                  <Text className="text-gray-500 mt-2">Đang tìm kiếm...</Text>
                </View>
              ) : Array.isArray(devices) && devices.length === 0 ? (
                <View className="items-center py-10">
                  <Text className="text-6xl mb-2">📡</Text>
                  <Text className="text-gray-400">Chưa tìm thấy thiết bị</Text>
                  <Text className="text-gray-300 text-xs mt-1">
                    Nhấn "Quét thiết bị" để tìm
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={Array.isArray(devices) ? devices : []}
                  keyExtractor={item => item?.id || Math.random().toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleConnect(item.id)}
                      className="bg-gray-50 rounded-xl p-4 mb-2"
                    >
                      <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">📱</Text>
                        <View className="flex-1">
                          <Text className="font-bold text-gray-800">
                            {item.name || 'Thiết bị không tên'}
                          </Text>
                          <Text className="text-gray-500 text-xs">
                            {item.id}
                          </Text>
                        </View>
                        <Text className="text-blue-600 font-bold">→</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 300 }}
                />
              )}
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            className="bg-gray-100 rounded-xl py-4 mt-4"
          >
            <Text className="text-gray-700 text-center font-bold">Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
