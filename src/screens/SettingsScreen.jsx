import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  StyleSheet,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { getSettings, updateSetting } from '../services/settings';
import { listBuyers } from '../services/buyers';
import { listTransactions } from '../services/transactions';
import {
  startAutoBackupScheduler,
  stopAutoBackupScheduler,
  runAutoBackupIfDue,
  getLastAutoBackupTime,
  LAST_AUTO_BACKUP_KEY,
} from '../services/autoBackup';
import BannerAd from '../components/BannerAd';
import { useInterstitialAd } from '../components/InterstitialAd';
import { useNavigation } from '@react-navigation/native';
import { pickFile } from '@dr.pogodin/react-native-fs';
import {
  exportEncryptedBackup,
  importEncryptedBackup,
  listAvailableBackups,
  copyBackupToDownloads,
  BACKUP_DIRECTORY,
  BACKUP_DOWNLOAD_DIRECTORY,
} from '../utils/backup';

export default function SettingsScreen() {
  useInterstitialAd(); // Show interstitial ad
  const navigation = useNavigation();

  const [autoBackup, setAutoBackup] = useState(false);
  const [fourDigitInput, setFourDigitInput] = useState(false);
  const [lastAutoBackupAt, setLastAutoBackupAt] = useState(null);
  const [dataStats, setDataStats] = useState({
    buyers: 0,
    transactions: 0,
    weighings: 0,
  });

  const refreshLastBackupTime = useCallback(async () => {
    const lastBackup = await getLastAutoBackupTime();
    setLastAutoBackupAt(lastBackup);
  }, []);

  const formatLastBackup = useCallback(value => {
    if (!value) {
      return 'Chưa từng sao lưu';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }, []);

  const loadDataStats = useCallback(async () => {
    const buyers = await listBuyers();
    const transactions = await listTransactions();

    // Weighings count - currently not implemented in SQLite
    // Will be 0 until we implement weighings feature
    const weighingCount = 0;

    setDataStats({
      buyers: buyers.length,
      transactions: transactions.length,
      weighings: weighingCount,
    });
  }, []);

  const loadSettings = useCallback(async () => {
    const settings = await getSettings();
    setAutoBackup(settings.autoBackup ?? false);
    setFourDigitInput(settings.fourDigitInput ?? false);

    // Load data statistics
    await loadDataStats();
    await refreshLastBackupTime();
  }, [loadDataStats, refreshLastBackupTime]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async (key, value) => {
    await updateSetting(key, value);
  };

  const shareBackupFile = async (filePath, fileName) => {
    try {
      await Share.share({
        title: 'Sao lưu Cân Lúa',
        message: `File sao lưu: ${fileName}`,
        url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
      });
    } catch (error) {
      console.warn('Không thể chia sẻ file sao lưu', error);
    }
  };

  const downloadBackupFile = async backup => {
    try {
      const saved = await copyBackupToDownloads({
        encrypted: backup.encrypted,
        fileName: backup.fileName,
      });
      Alert.alert(
        'Đã tải về',
        `File đã được sao chép vào thư mục Tải xuống:\n${saved.filePath}\n\nThư mục mặc định: ${BACKUP_DOWNLOAD_DIRECTORY}`,
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải file về: ' + error.message);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Xóa tất cả dữ liệu',
      'Bạn có chắc muốn xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác!',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const { executeSql } = require('../services/database');
            await executeSql('DELETE FROM transactions');
            await executeSql('DELETE FROM buyers');
            await executeSql('DELETE FROM app_settings');
            Alert.alert('Thành công', 'Đã xóa toàn bộ dữ liệu');
            await loadSettings();
          },
        },
      ],
    );
  };

  const handleExportData = async () => {
    try {
      const result = await exportEncryptedBackup();
      const summaryMessage = `• ${result.buyers} người mua\n• ${result.transactions} giao dịch\n• ${result.weighings} lần cân\n\nFile mã hoá đã được lưu tại:\n${result.filePath}\n\nThư mục sao lưu: ${BACKUP_DIRECTORY}`;

      const { setSettingValue } = require('../services/settings');
      await setSettingValue(LAST_AUTO_BACKUP_KEY, new Date().toISOString());
      await refreshLastBackupTime();

      Alert.alert('Sao lưu thành công', summaryMessage, [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Tải về',
          onPress: () => downloadBackupFile(result),
        },
        {
          text: 'Chia sẻ',
          onPress: () => shareBackupFile(result.filePath, result.fileName),
        },
      ]);

      return result;
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể sao lưu dữ liệu: ' + error.message);
      throw error;
    }
  };

  const restoreFromBackup = async file => {
    try {
      const summary = await importEncryptedBackup(file.path);
      await loadSettings();
      Alert.alert(
        'Khôi phục thành công',
        `Đã nhập dữ liệu từ ${file.name}\n\n• ${summary.buyers} người mua\n• ${summary.transactions} giao dịch\n• ${summary.weighings} lần cân`,
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể nhập dữ liệu: ' + error.message);
    }
  };

  const importLatestBackup = async () => {
    try {
      const backups = await listAvailableBackups();
      if (!backups.length) {
        Alert.alert(
          'Chưa có bản sao lưu',
          `Hãy xuất dữ liệu trước. File sao lưu sẽ được tạo trong thư mục:\n${BACKUP_DIRECTORY}`,
        );
        return;
      }

      const latest = backups[0];
      Alert.alert(
        'Nhập dữ liệu',
        `Sử dụng file: ${latest.name}?\n\nVị trí: ${latest.path}`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Nhập', onPress: () => restoreFromBackup(latest) },
        ],
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể đọc thư mục sao lưu: ' + error.message);
    }
  };

  const normalizePickedPath = path =>
    path.startsWith('file://') ? path.replace('file://', '') : path;

  const pickBackupFromDevice = async () => {
    try {
      const paths = await pickFile({
        pickerType: 'singleFile',
        fileExtensions: ['clb', 'json'],
        mimeTypes: ['*/*'],
      });

      if (!paths || !paths.length) {
        return;
      }

      const pickedPath = normalizePickedPath(paths[0]);
      const name = pickedPath.split('/').pop() || 'backup.clb';
      await restoreFromBackup({ path: pickedPath, name });
    } catch (error) {
      if (error?.message?.includes('cancelled')) {
        return;
      }
      Alert.alert('Lỗi', 'Không thể chọn file: ' + error.message);
    }
  };

  const handleImportData = () => {
    Alert.alert('Nhập dữ liệu', 'Chọn nguồn sao lưu', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Chọn file...', onPress: pickBackupFromDevice },
      { text: 'Dùng bản mới nhất', onPress: importLatestBackup },
    ]);
  };

  const handleMonthlyReport = () => {
    navigation.navigate('Statistics');
    Alert.alert(
      'Báo cáo tháng',
      'Đã chuyển đến màn hình Thống kê để xem báo cáo chi tiết.',
    );
  };

  const handleYearlyReport = () => {
    navigation.navigate('Statistics');
    Alert.alert(
      'Báo cáo năm',
      'Đã chuyển đến màn hình Thống kê. Bạn có thể chọn năm để xem báo cáo.',
    );
  };

  const handleReminders = () => {
    Alert.alert(
      'Nhắc nhở',
      'Tính năng nhắc nhở sẽ giúp bạn:\n• Nhắc thu tiền\n• Nhắc cân lúa\n• Nhắc kiểm tra tồn kho\n\nTính năng này đang được phát triển.',
      [{ text: 'OK' }],
    );
  };

  const handleSupport = async () => {
    const email = 'khoa882k@gmail.com';
    const subject = 'Hỗ trợ ứng dụng Cân Lúa';
    const body = `Xin chào,\n\nTôi cần hỗ trợ về:\n\n[Mô tả vấn đề của bạn]\n\n---\nPhiên bản: 1.0.0\nNgười mua: ${dataStats.buyers}\nGiao dịch: ${dataStats.transactions}`;

    const url = `mailto:${email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'Lỗi',
        'Không thể mở ứng dụng email. Vui lòng liên hệ: ' + email,
      );
    }
  };

  const handleAutoBackupToggle = async val => {
    setAutoBackup(val);
    await saveSettings('autoBackup', val);

    if (val) {
      try {
        startAutoBackupScheduler();
        const result = await runAutoBackupIfDue({ force: true });
        await refreshLastBackupTime();

        if (result) {
          const summaryMessage = `• ${result.buyers} người mua\n• ${result.transactions} giao dịch\n• ${result.weighings} lần cân\n\nFile mã hoá đã được lưu tại:\n${result.filePath}\n\nThư mục sao lưu: ${BACKUP_DIRECTORY}`;
          Alert.alert('Tự động sao lưu đã bật', summaryMessage, [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Tải về',
              onPress: () => downloadBackupFile(result),
            },
            {
              text: 'Chia sẻ',
              onPress: () => shareBackupFile(result.filePath, result.fileName),
            },
          ]);
        } else {
          Alert.alert(
            'Tự động sao lưu đã bật',
            'Bản sao lưu đầu tiên sẽ được tạo ngay khi đủ điều kiện.',
          );
        }
      } catch (error) {
        setAutoBackup(false);
        await saveSettings('autoBackup', false);
        stopAutoBackupScheduler();
        Alert.alert(
          'Lỗi',
          'Không thể bật tự động sao lưu. Vui lòng thử lại: ' + error.message,
        );
      }
    } else {
      stopAutoBackupScheduler();
      Alert.alert(
        'Tự động sao lưu đã tắt',
        'Dữ liệu sẽ không được sao lưu tự động nữa.',
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-emerald-500 pt-12 pb-6 px-5 rounded-b-3xl">
        <Text className="text-3xl font-bold text-white mb-2">⚙️ Cài đặt</Text>
        <Text className="text-emerald-100">Quản lý ứng dụng</Text>
      </View>

      {/* Banner Ad */}
      <BannerAd />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Info */}
        <View
          className="mx-5 mt-4 bg-white rounded-2xl p-5"
          style={styles.shadow}
        >
          <Text className="text-lg font-bold text-gray-800 mb-3">
            📱 Thông tin ứng dụng
          </Text>
          <View className="py-2">
            <Text className="text-gray-600">Tên ứng dụng</Text>
            <Text className="text-gray-800 font-bold text-lg">Cân Lúa</Text>
          </View>
          <View className="py-2">
            <Text className="text-gray-600">Phiên bản</Text>
            <Text className="text-gray-800 font-bold">1.0.0</Text>
          </View>
          <View className="py-2">
            <Text className="text-gray-600">Dữ liệu hiện tại</Text>
            <Text className="text-gray-800">
              {dataStats.buyers} người mua • {dataStats.transactions} giao dịch
              • {dataStats.weighings} lần cân
            </Text>
          </View>
        </View>

        {/* Preferences */}
        <View
          className="mx-5 mt-4 bg-white rounded-2xl p-5"
          style={styles.shadow}
        >
          <Text className="text-lg font-bold text-gray-800 mb-3">
            🔔 Tùy chọn
          </Text>

          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-1">
              <Text className="text-gray-800 font-semibold">
                Tự động sao lưu
              </Text>
              <Text className="text-gray-500 text-xs">
                Sao lưu dữ liệu định kỳ
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                Lần gần nhất: {formatLastBackup(lastAutoBackupAt)}
              </Text>
            </View>
            <Switch
              value={autoBackup}
              onValueChange={handleAutoBackupToggle}
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              thumbColor={autoBackup ? '#fff' : '#f3f4f6'}
            />
          </View>

          <View className="flex-row items-center justify-between py-3">
            <View className="flex-1">
              <Text className="text-gray-800 font-semibold">
                Nhập hàng trăm (4 số)
              </Text>
              <Text className="text-gray-500 text-xs">
                Cho phép nhập 4 chữ số thay vì 3
              </Text>
            </View>
            <Switch
              value={fourDigitInput}
              onValueChange={val => {
                setFourDigitInput(val);
                saveSettings('fourDigitInput', val);
              }}
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              thumbColor={fourDigitInput ? '#fff' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* Data Management */}
        <View
          className="mx-5 mt-4 bg-white rounded-2xl p-5"
          style={styles.shadow}
        >
          <Text className="text-lg font-bold text-gray-800 mb-3">
            💾 Quản lý dữ liệu
          </Text>

          <TouchableOpacity
            onPress={handleExportData}
            className="bg-blue-50 rounded-xl p-4 mb-3"
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">📤</Text>
              <View className="flex-1">
                <Text className="font-bold text-blue-700">Xuất dữ liệu</Text>
                <Text className="text-blue-600 text-xs">
                  Sao lưu dữ liệu ra file
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleImportData}
            className="bg-gray-50 rounded-xl p-4 mb-3"
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">📥</Text>
              <View className="flex-1">
                <Text className="font-bold text-gray-700">Nhập dữ liệu</Text>
                <Text className="text-gray-600 text-xs">
                  Khôi phục từ file sao lưu
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClearData}
            className="bg-red-50 rounded-xl p-4"
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">🗑️</Text>
              <View className="flex-1">
                <Text className="font-bold text-red-700">
                  Xóa tất cả dữ liệu
                </Text>
                <Text className="text-red-600 text-xs">
                  Xóa toàn bộ dữ liệu ứng dụng
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View
          className="mx-5 mt-4 bg-white rounded-2xl p-5"
          style={styles.shadow}
        >
          <Text className="text-lg font-bold text-gray-800 mb-3">
            ⚡ Thao tác nhanh
          </Text>

          <TouchableOpacity
            onPress={handleMonthlyReport}
            className="bg-emerald-50 rounded-xl p-4 mb-3"
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">📊</Text>
              <View className="flex-1">
                <Text className="font-bold text-emerald-700">
                  Báo cáo tháng
                </Text>
                <Text className="text-emerald-600 text-xs">
                  Xem báo cáo tháng hiện tại
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleYearlyReport}
            className="bg-purple-50 rounded-xl p-4 mb-3"
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">📈</Text>
              <View className="flex-1">
                <Text className="font-bold text-purple-700">Báo cáo năm</Text>
                <Text className="text-purple-600 text-xs">
                  Xem báo cáo năm hiện tại
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReminders}
            className="bg-orange-50 rounded-xl p-4"
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">🔔</Text>
              <View className="flex-1">
                <Text className="font-bold text-orange-700">Nhắc nhở</Text>
                <Text className="text-orange-600 text-xs">
                  Cài đặt nhắc nhở công việc
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View
          className="mx-5 mt-4 bg-white rounded-2xl p-5"
          style={styles.shadow}
        >
          <Text className="text-lg font-bold text-gray-800 mb-3">
            ℹ️ Về ứng dụng
          </Text>
          <Text className="text-gray-600 leading-6">
            Ứng dụng Cân Lúa giúp nông dân quản lý việc mua bán lúa gạo một cách
            dễ dàng và hiệu quả. Theo dõi khối lượng, tính toán tiền, quản lý
            thu chi và xem thống kê chi tiết.
          </Text>
          <View className="mt-4 pt-4 border-t border-gray-100">
            <Text className="text-gray-500 text-xs text-center">
              © 2024 Cân Lúa. All rights reserved.
            </Text>
          </View>
        </View>

        {/* Support */}
        <View
          className="mx-5 mt-4 mb-4 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl p-5"
          style={styles.shadow}
        >
          <Text className="text-xl font-bold text-white mb-2">💚 Hỗ trợ</Text>
          <Text className="text-white mb-4">
            Nếu bạn gặp vấn đề hoặc có góp ý, vui lòng liên hệ với chúng tôi.
          </Text>
          <TouchableOpacity
            onPress={handleSupport}
            className="bg-white rounded-xl py-3"
          >
            <Text className="text-emerald-600 font-bold text-center">
              📧 Liên hệ hỗ trợ
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
