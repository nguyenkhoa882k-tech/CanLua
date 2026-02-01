import BleManager from 'react-native-ble-manager';
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  PermissionsAndroid,
} from 'react-native';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

class BluetoothService {
  constructor() {
    this.isInitialized = false;
    this.connectedDevice = null;
    this.listeners = [];
    this.weightListeners = [];
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await BleManager.start({ showAlert: false });
      this.isInitialized = true;
      console.log('✅ Bluetooth initialized');

      // Setup listeners
      this.setupListeners();
    } catch (error) {
      console.error('❌ Bluetooth initialization failed:', error);
      throw error;
    }
  }

  setupListeners() {
    // Listener for discovered devices
    this.listeners.push(
      bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', device => {
        console.log('📱 Discovered device:', device.name || device.id);
      }),
    );

    // Listener for connection
    this.listeners.push(
      bleManagerEmitter.addListener('BleManagerConnectPeripheral', device => {
        console.log('✅ Connected to:', device.peripheral);
      }),
    );

    // Listener for disconnection
    this.listeners.push(
      bleManagerEmitter.addListener(
        'BleManagerDisconnectPeripheral',
        device => {
          console.log('❌ Disconnected from:', device.peripheral);
          if (this.connectedDevice?.id === device.peripheral) {
            this.connectedDevice = null;
          }
        },
      ),
    );

    // Listener for data updates
    this.listeners.push(
      bleManagerEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        data => {
          console.log('📊 Received data:', data);
          this.handleWeightData(data);
        },
      ),
    );
  }

  handleWeightData(data) {
    try {
      // Parse weight data from the scale
      // This depends on your scale's protocol
      const weight = this.parseWeightFromData(data.value);

      // Notify all weight listeners
      this.weightListeners.forEach(listener => listener(weight));
    } catch (error) {
      console.error('Error parsing weight data:', error);
    }
  }

  parseWeightFromData(dataArray) {
    // Example parsing - adjust based on your scale's protocol
    // Most scales send weight as ASCII or binary data

    if (!dataArray || dataArray.length === 0) return null;

    try {
      // Try to convert to string (for ASCII scales)
      const str = String.fromCharCode(...dataArray);
      const match = str.match(/(\d+\.?\d*)/);

      if (match) {
        return parseFloat(match[1]);
      }

      // Alternative: binary parsing (for some scales)
      // const weight = (dataArray[0] << 8) | dataArray[1];
      // return weight / 10; // Adjust divisor based on scale

      return null;
    } catch (error) {
      console.error('Error parsing weight:', error);
      return null;
    }
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        // Android 12+
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted['android.permission.BLUETOOTH_SCAN'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // Android 11 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; // iOS handles permissions automatically
  }

  async scanDevices(timeout = 5000) {
    try {
      await this.initialize();

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Bluetooth permissions not granted');
      }

      // Clear previous scan results
      await BleManager.scan([], timeout / 1000, true);

      // Wait for scan to complete
      await new Promise(resolve => setTimeout(resolve, timeout));

      // Get discovered devices
      const devices = await BleManager.getDiscoveredPeripherals();

      // Filter out devices without names (usually not useful)
      return devices.filter(device => device.name && device.name.trim() !== '');
    } catch (error) {
      console.error('Error scanning devices:', error);
      throw error;
    }
  }

  async connect(deviceId) {
    try {
      await BleManager.connect(deviceId);

      // Retrieve device info
      const deviceInfo = await BleManager.retrieveServices(deviceId);

      this.connectedDevice = {
        id: deviceId,
        info: deviceInfo,
      };

      console.log('✅ Connected to device:', deviceId);
      return true;
    } catch (error) {
      console.error('Error connecting to device:', error);
      throw error;
    }
  }

  async disconnect() {
    if (!this.connectedDevice) return;

    try {
      await BleManager.disconnect(this.connectedDevice.id);
      this.connectedDevice = null;
      console.log('✅ Disconnected from device');
    } catch (error) {
      console.error('Error disconnecting:', error);
      throw error;
    }
  }

  isConnected() {
    return this.connectedDevice !== null;
  }

  getConnectedDevice() {
    return this.connectedDevice;
  }

  onWeightUpdate(callback) {
    this.weightListeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.weightListeners = this.weightListeners.filter(cb => cb !== callback);
    };
  }

  async startNotifications(serviceUUID, characteristicUUID) {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    try {
      await BleManager.startNotification(
        this.connectedDevice.id,
        serviceUUID,
        characteristicUUID,
      );
      console.log('✅ Started notifications');
    } catch (error) {
      console.error('Error starting notifications:', error);
      throw error;
    }
  }

  cleanup() {
    this.listeners.forEach(listener => listener.remove());
    this.listeners = [];
    this.weightListeners = [];
  }
}

export default new BluetoothService();
