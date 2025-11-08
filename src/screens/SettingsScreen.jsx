import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, StyleSheet } from 'react-native';
import { storage } from '../services/storage';
import BannerAd from '../components/BannerAd';
import { useInterstitialAd } from '../components/InterstitialAd';

export default function SettingsScreen() {
  useInterstitialAd(); // Show interstitial ad
  
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [fourDigitInput, setFourDigitInput] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await storage.get('app_settings');
    if (settings) {
      setNotifications(settings.notifications ?? true);
      setAutoBackup(settings.autoBackup ?? false);
      setFourDigitInput(settings.fourDigitInput ?? false);
    }
  };

  const saveSettings = async (key, value) => {
    const settings = await storage.get('app_settings') || {};
    settings[key] = value;
    console.log("value",value);
    
    await storage.set('app_settings', settings);
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
            await storage.clear();
            Alert.alert('Thành công', 'Đã xóa toàn bộ dữ liệu');
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    const buyers = await storage.get('buyers');
    const transactions = await storage.get('transactions');
    
    const data = {
      buyers: buyers || [],
      transactions: transactions || [],
      exportedAt: new Date().toISOString(),
    };

    Alert.alert(
      'Xuất dữ liệu',
      `Đã chuẩn bị dữ liệu:\n- ${data.buyers.length} người mua\n- ${data.transactions.length} giao dịch\n\nDữ liệu: ${JSON.stringify(data).substring(0, 100)}...`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-emerald-500 pt-12 pb-6 px-5 rounded-b-3xl">
        <Text className="text-3xl font-bold text-white mb-2">⚙️ Cài đặt</Text>
        <Text className="text-emerald-100">Quản lý ứng dụng</Text>
      </View>

      {/* Banner Ad */}
      <BannerAd />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* App Info */}
        <View className="mx-5 mt-4 bg-white rounded-2xl p-5" style={styles.shadow}>
          <Text className="text-lg font-bold text-gray-800 mb-3">📱 Thông tin ứng dụng</Text>
          <View className="py-2">
            <Text className="text-gray-600">Tên ứng dụng</Text>
            <Text className="text-gray-800 font-bold text-lg">Cân Lúa</Text>
          </View>
          <View className="py-2">
            <Text className="text-gray-600">Phiên bản</Text>
            <Text className="text-gray-800 font-bold">1.0.0</Text>
          </View>
          <View className="py-2">
            <Text className="text-gray-600">Mô tả</Text>
            <Text className="text-gray-800">Quản lý mua bán lúa gạo</Text>
          </View>
        </View>

        {/* Preferences */}
        <View className="mx-5 mt-4 bg-white rounded-2xl p-5" style={styles.shadow}>
          <Text className="text-lg font-bold text-gray-800 mb-3">🔔 Tùy chọn</Text>
          
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-1">
              <Text className="text-gray-800 font-semibold">Thông báo</Text>
              <Text className="text-gray-500 text-xs">Nhận thông báo từ ứng dụng</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={(val) => { setNotifications(val); saveSettings('notifications', val); }}
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              thumbColor={notifications ? '#fff' : '#f3f4f6'}
            />
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-1">
              <Text className="text-gray-800 font-semibold">Tự động sao lưu</Text>
              <Text className="text-gray-500 text-xs">Sao lưu dữ liệu định kỳ</Text>
            </View>
            <Switch
              value={autoBackup}
              onValueChange={(val) => { setAutoBackup(val); saveSettings('autoBackup', val); }}
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              thumbColor={autoBackup ? '#fff' : '#f3f4f6'}
            />
          </View>

          <View className="flex-row items-center justify-between py-3">
            <View className="flex-1">
              <Text className="text-gray-800 font-semibold">Nhập hàng trăm (4 số)</Text>
              <Text className="text-gray-500 text-xs">Cho phép nhập 4 chữ số thay vì 3</Text>
            </View>
            <Switch
              value={fourDigitInput}
              onValueChange={(val) => { setFourDigitInput(val); saveSettings('fourDigitInput', val); Alert.alert('Thông báo', 'Vui lòng khởi động lại ứng dụng để áp dụng thay đổi'); }}
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              thumbColor={fourDigitInput ? '#fff' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* Data Management */}
        <View className="mx-5 mt-4 bg-white rounded-2xl p-5" style={styles.shadow}>
          <Text className="text-lg font-bold text-gray-800 mb-3">💾 Quản lý dữ liệu</Text>
          
          <TouchableOpacity
            onPress={handleExportData}
            className="bg-blue-50 rounded-xl p-4 mb-3"
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">📤</Text>
              <View className="flex-1">
                <Text className="font-bold text-blue-700">Xuất dữ liệu</Text>
                <Text className="text-blue-600 text-xs">Sao lưu dữ liệu ra file</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-50 rounded-xl p-4 mb-3"
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">📥</Text>
              <View className="flex-1">
                <Text className="font-bold text-gray-700">Nhập dữ liệu</Text>
                <Text className="text-gray-600 text-xs">Khôi phục từ file sao lưu</Text>
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
                <Text className="font-bold text-red-700">Xóa tất cả dữ liệu</Text>
                <Text className="text-red-600 text-xs">Xóa toàn bộ dữ liệu ứng dụng</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View className="mx-5 mt-4 bg-white rounded-2xl p-5" style={styles.shadow}>
          <Text className="text-lg font-bold text-gray-800 mb-3">⚡ Thao tác nhanh</Text>
          
          <TouchableOpacity className="bg-emerald-50 rounded-xl p-4 mb-3">
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">📊</Text>
              <View className="flex-1">
                <Text className="font-bold text-emerald-700">Báo cáo tháng</Text>
                <Text className="text-emerald-600 text-xs">Xem báo cáo tháng hiện tại</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-purple-50 rounded-xl p-4 mb-3">
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">📈</Text>
              <View className="flex-1">
                <Text className="font-bold text-purple-700">Báo cáo năm</Text>
                <Text className="text-purple-600 text-xs">Xem báo cáo năm hiện tại</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-orange-50 rounded-xl p-4">
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">🔔</Text>
              <View className="flex-1">
                <Text className="font-bold text-orange-700">Nhắc nhở</Text>
                <Text className="text-orange-600 text-xs">Cài đặt nhắc nhở công việc</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View className="mx-5 mt-4 bg-white rounded-2xl p-5" style={styles.shadow}>
          <Text className="text-lg font-bold text-gray-800 mb-3">ℹ️ Về ứng dụng</Text>
          <Text className="text-gray-600 leading-6">
            Ứng dụng Cân Lúa giúp nông dân quản lý việc mua bán lúa gạo một cách dễ dàng và hiệu quả. 
            Theo dõi khối lượng, tính toán tiền, quản lý thu chi và xem thống kê chi tiết.
          </Text>
          <View className="mt-4 pt-4 border-t border-gray-100">
            <Text className="text-gray-500 text-xs text-center">
              © 2024 Cân Lúa. All rights reserved.
            </Text>
          </View>
        </View>

        {/* Support */}
        <View className="mx-5 mt-4 mb-4 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl p-5" style={styles.shadow}>
          <Text className="text-xl font-bold text-white mb-2">💚 Hỗ trợ</Text>
          <Text className="text-white mb-4">
            Nếu bạn gặp vấn đề hoặc có góp ý, vui lòng liên hệ với chúng tôi.
          </Text>
          <TouchableOpacity className="bg-white rounded-xl py-3">
            <Text className="text-emerald-600 font-bold text-center">📧 Liên hệ hỗ trợ</Text>
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
});
