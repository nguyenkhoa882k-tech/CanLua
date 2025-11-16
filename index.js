/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App.jsx';
import { name as appName } from './app.json';
import { bootstrapAutoBackupScheduler } from './src/services/autoBackup';

bootstrapAutoBackupScheduler().catch(error => {
  console.warn('Không thể khởi động bộ hẹn giờ sao lưu', error);
});

AppRegistry.registerComponent(appName, () => App);
