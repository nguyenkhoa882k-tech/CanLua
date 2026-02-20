import React, { useState, useEffect, useCallback } from 'react';
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
  // Use individual selectors to ensure re-renders
  const isScanning = useBluetoothStore(state => state.isScanning);
  const isConnected = useBluetoothStore(state => state.isConnected);
  const devices = useBluetoothStore(state => state.devices);
  const connectedDevice = useBluetoothStore(state => state.connectedDevice);
  const error = useBluetoothStore(state => state.error);
  const scanDevices = useBluetoothStore(state => state.scanDevices);
  const connectDevice = useBluetoothStore(state => state.connectDevice);
  const disconnectDevice = useBluetoothStore(state => state.disconnectDevice);
  const clearError = useBluetoothStore(state => state.clearError);

  const [localError, setLocalError] = useState(null);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = useCallback(async () => {
    setLocalError(null);
    clearError();
    setHasScanned(true);
    try {
      console.log('🔍 Modal: Starting scan...');
      const foundDevices = await scanDevices();
      console.log(
        '✅ Modal: Scan complete, found:',
        foundDevices?.length || 0,
        foundDevices,
      );
      console.log('📊 Modal: Current devices state:', devices);
    } catch (err) {
      console.error('❌ Modal: Scan error:', err);
      const errorMessage =
        err?.message || 'Lỗi không xác định khi quét Bluetooth';
      setLocalError(errorMessage);
    }
  }, [scanDevices, clearError, devices]);

  // Auto-scan when modal opens (only if not connected and hasn't scanned yet)
  useEffect(() => {
    console.log('🔄 Modal useEffect:', { visible, isConnected, hasScanned });

    if (visible && !isConnected && !hasScanned) {
      console.log('🚀 Auto-starting scan...');
      handleScan();
    }

    // Reset hasScanned when modal closes
    if (!visible) {
      console.log('🔄 Modal closed, resetting hasScanned');
      setHasScanned(false);
    }
  }, [visible, isConnected, hasScanned, handleScan]);

  // Debug: Log devices changes
  useEffect(() => {
    console.log('🔄 Modal: devices changed:', devices?.length || 0, devices);
  }, [devices]);

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

  const renderDeviceItem = ({ item, index }) => {
    console.log('🎨 FlatList rendering device:', index, item);
    return (
      <TouchableOpacity
        onPress={() => handleConnect(item.id)}
        style={styles.deviceCard}
      >
        <View style={styles.deviceIcon}>
          <Text style={{ fontSize: 24 }}>📱</Text>
        </View>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>
            {item.name || `Thiết bị ${index + 1}`}
          </Text>
          <Text style={styles.deviceId}>{item.id}</Text>
          {item.rssi && (
            <Text style={styles.deviceRssi}>Tín hiệu: {item.rssi} dBm</Text>
          )}
        </View>
        <View style={styles.connectButton}>
          <Text style={styles.connectButtonText}>Kết nối</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>📡 Kết nối Bluetooth</Text>

          {/* Connected Device */}
          {isConnected && connectedDevice && (
            <View style={styles.connectedCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.connectedTitle}>✅ Đã kết nối</Text>
                <Text style={styles.connectedName}>
                  {connectedDevice.name || connectedDevice.id}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleDisconnect}
                style={styles.disconnectButton}
              >
                <Text style={styles.disconnectButtonText}>Ngắt</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error Message */}
          {displayError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>❌ Lỗi</Text>
              <Text style={styles.errorMessage}>{displayError}</Text>
            </View>
          )}

          {/* Scan Button */}
          <TouchableOpacity
            onPress={handleScan}
            disabled={isScanning}
            style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          >
            <Text style={styles.scanButtonText}>
              {isScanning ? '🔄 Đang quét...' : '🔍 Quét thiết bị'}
            </Text>
          </TouchableOpacity>

          {/* Device List Header */}
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              Thiết bị tìm thấy: {devices.length}
            </Text>
            {!isScanning && devices.length > 0 && (
              <Text style={styles.listHeaderComplete}>✓ Hoàn tất</Text>
            )}
          </View>

          {/* Debug info */}
          <Text style={styles.debugText}>
            Debug: isScanning={isScanning ? 'true' : 'false'}, devices=
            {devices.length}, hasScanned={hasScanned ? 'true' : 'false'}
          </Text>

          {/* Device List */}
          {isScanning ? (
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.scanningText}>Đang quét Bluetooth...</Text>
              <Text style={styles.scanningSubtext}>
                Vui lòng đợi trong giây lát
              </Text>
            </View>
          ) : devices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 60, marginBottom: 12 }}>📡</Text>
              <Text style={styles.emptyText}>
                {hasScanned ? 'Không tìm thấy thiết bị' : 'Chưa quét thiết bị'}
              </Text>
              <Text style={styles.emptySubtext}>
                {hasScanned
                  ? 'Thử quét lại hoặc kiểm tra Bluetooth trên thiết bị'
                  : 'Nhấn "Quét thiết bị" để bắt đầu'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={devices}
              renderItem={renderDeviceItem}
              keyExtractor={(item, index) => item.id || String(index)}
              showsVerticalScrollIndicator={false}
              style={styles.deviceList}
            />
          )}

          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Đóng</Text>
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
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  connectedCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#bbf7d0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedTitle: {
    color: '#15803d',
    fontWeight: 'bold',
    fontSize: 16,
  },
  connectedName: {
    color: '#16a34a',
    fontSize: 14,
    marginTop: 4,
  },
  disconnectButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disconnectButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  errorTitle: {
    color: '#b91c1c',
    fontWeight: 'bold',
  },
  errorMessage: {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  scanButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  scanButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listHeaderText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  listHeaderComplete: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 8,
  },
  scanningContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
  },
  scanningText: {
    color: '#374151',
    marginTop: 16,
    fontWeight: '600',
    fontSize: 16,
  },
  scanningSubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  emptyText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 16,
  },
  emptySubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    padding: 12,
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontWeight: 'bold',
    color: '#1f2937',
    fontSize: 16,
  },
  deviceId: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  deviceRssi: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  connectButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  closeButtonText: {
    color: '#1f2937',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
