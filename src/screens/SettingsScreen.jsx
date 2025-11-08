import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, StyleSheet, Linking, Share } from 'react-native';
import { storage } from '../services/storage';
import BannerAd from '../components/BannerAd';
import { useInterstitialAd } from '../components/InterstitialAd';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  useInterstitialAd(); // Show interstitial ad
  const navigation = useNavigation();
  
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [fourDigitInput, setFourDigitInput] = useState(false);
  const [dataStats, setDataStats] = useState({ buyers: 0, transactions: 0, weighings: 0 });

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
    
    // Load data statistics
    await loadDataStats();
  };

  const loadDataStats = async () => {
    const buyers = await storage.get('buyers') || [];
    const transactions = await storage.get('transactions') || [];
    
    // Count weighings
    let weighingCount = 0;
    for (const buyer of buyers) {
      const sellers = await storage.get(`sellers_${buyer.id}`) || [];
      for (const seller of sellers) {
        const weighing = await storage.get(`weighing_${buyer.id}_${seller.id}`);
        if (weighing && weighing.confirmed) {
          weighingCount++;
        }
      }
    }
    
    setDataStats({
      buyers: buyers.length,
      transactions: transactions.length,
      weighings: weighingCount,
    });
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
    try {
      const buyers = await storage.get('buyers') || [];
      const transactions = await storage.get('transactions') || [];
      const settings = await storage.get('app_settings') || {};
      
      // Collect all weighing data
      const weighings = [];
      for (const buyer of buyers) {
        const sellers = await storage.get(`sellers_${buyer.id}`) || [];
        for (const seller of sellers) {
          const weighing = await storage.get(`weighing_${buyer.id}_${seller.id}`);
          if (weighing) {
            weighings.push({
              buyerId: buyer.id,
              sellerId: seller.id,
              data: weighing,
            });
          }
        }
      }
      
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        buyers,
        transactions,
        weighings,
        settings,
      };

      const dataString = JSON.stringify(exportData, null, 2);
      
      // Share data
      await Share.share({
        message: dataString,
        title: 'Dữ liệu Cân Lúa',
      });
      
      Alert.alert(
        'Xuất dữ liệu thành công',
        `Đã xuất:\n• ${buyers.length} người mua\n• ${transactions.length} giao dịch\n• ${weighings.length} lần cân\n\nDữ liệu đã được chia sẻ!`
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể xuất dữ liệu: ' + error.message);
    }
  };

  const handleImportData = () => {
    Alert.alert(
      'Nhập dữ liệu',
      'Tính năng này sẽ cho phép bạn khôi phục dữ liệu từ file sao lưu. Hiện tại bạn có thể dán dữ liệu JSON đã xuất vào ứng dụng.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Hướng dẫn',
          onPress: () => Alert.alert(
            'Hướng dẫn nhập dữ liệu',
            '1. Xuất dữ liệu từ ứng dụng\n2. Lưu file JSON\n3. Khi cần khôi phục, mở file và copy nội dung\n4. Dán vào ứng dụng để khôi phục\n\nLưu ý: Tính năng này đang được phát triển.'
          ),
        },
      ]
    );
  };

  const handleMonthlyReport = () => {
    navigation.navigate('Statistics');
    Alert.alert('Báo cáo tháng', 'Đã chuyển đến màn hình Thống kê để xem báo cáo chi tiết.');
  };

  const handleYearlyReport = () => {
    navigation.navigate('Statistics');
    Alert.alert('Báo cáo năm', 'Đã chuyển đến màn hình Thống kê. Bạn có thể chọn năm để xem báo cáo.');
  };

  const handleReminders = () => {
    Alert.alert(
      'Nhắc nhở',
      'Tính năng nhắc nhở sẽ giúp bạn:\n• Nhắc thu tiền\n• Nhắc cân lúa\n• Nhắc kiểm tra tồn kho\n\nTính năng này đang được phát triển.',
      [{ text: 'OK' }]
    );
  };

  const handleSupport = async () => {
    const email = 'support@canlua.app';
    const subject = 'Hỗ trợ ứng dụng Cân Lúa';
    const body = `Xin chào,\n\nTôi cần hỗ trợ về:\n\n[Mô tả vấn đề của bạn]\n\n---\nPhiên bản: 1.0.0\nNgười mua: ${dataStats.buyers}\nGiao dịch: ${dataStats.transactions}`;
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Lỗi', 'Không thể mở ứng dụng email. Vui lòng liên hệ: ' + email);
    }
  };

  const handleNotificationToggle = (val) => {
    setNotifications(val);
    saveSettings('notifications', val);
    
    if (val) {
      Alert.alert('Thông báo đã bật', 'Bạn sẽ nhận được thông báo từ ứng dụng.');
    } else {
      Alert.alert('Thông báo đã tắt', 'Bạn sẽ không nhận thông báo nữa.');
    }
  };

  const handleAutoBackupToggle = async (val) => {
    setAutoBackup(val);
    saveSettings('autoBackup', val);
    
    if (val) {
      // Perform immediate backup
      await handleExportData();
      Alert.alert('Tự động sao lưu đã bật', 'Dữ liệu sẽ được sao lưu định kỳ. Bạn vừa thực hiện sao lưu đầu tiên.');
    } else {
      Alert.alert('Tự động sao lưu đã tắt', 'Dữ liệu sẽ không được sao lưu tự động nữa.');
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
            <Text className="text-gray-600">Dữ liệu hiện tại</Text>
            <Text className="text-gray-800">{dataStats.buyers} người mua • {dataStats.transactions} giao dịch • {dataStats.weighings} lần cân</Text>
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
              onValueChange={handleNotificationToggle}
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
              onValueChange={handleAutoBackupToggle}
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
              onValueChange={(val) => { setFourDigitInput(val); saveSettings('fourDigitInput', val);  }}
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
            onPress={handleImportData}
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
          
          <TouchableOpacity onPress={handleMonthlyReport} className="bg-emerald-50 rounded-xl p-4 mb-3">
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">📊</Text>
              <View className="flex-1">
                <Text className="font-bold text-emerald-700">Báo cáo tháng</Text>
                <Text className="text-emerald-600 text-xs">Xem báo cáo tháng hiện tại</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleYearlyReport} className="bg-purple-50 rounded-xl p-4 mb-3">
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">📈</Text>
              <View className="flex-1">
                <Text className="font-bold text-purple-700">Báo cáo năm</Text>
                <Text className="text-purple-600 text-xs">Xem báo cáo năm hiện tại</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReminders} className="bg-orange-50 rounded-xl p-4">
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
          <TouchableOpacity onPress={handleSupport} className="bg-white rounded-xl py-3">
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
