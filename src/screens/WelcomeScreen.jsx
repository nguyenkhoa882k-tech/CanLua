import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function WelcomeScreen() {
  const navigation = useNavigation();

  const handleContinue = () => {
    navigation.replace('Main');
  };

  return (
    <View className="flex-1 bg-emerald-500">
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="w-28 h-28 bg-white rounded-full items-center justify-center mb-8"
          style={styles.avatarShadow}
        >
          <Text className="text-4xl font-black text-emerald-600">CL</Text>
          <Text className="text-xs text-emerald-400 tracking-[2px] mt-1">
            CÂN LÚA
          </Text>
        </View>

        <Text className="text-3xl font-bold text-white text-center mb-3">
          Chào mừng đến với Cân Lúa
        </Text>
        <Text className="text-white text-center text-base opacity-90 mb-8">
          Quản lý mua bán lúa gạo, theo dõi giao dịch và cân lúa chính xác mỗi
          ngày.
        </Text>

        <View className="bg-emerald-400/40 rounded-3xl px-6 py-4 mb-10 w-full">
          <Text className="text-white font-semibold mb-2">Bạn có thể:</Text>
          <Text className="text-white/90 text-sm mb-1">
            • Ghi nhanh người mua bán
          </Text>
          <Text className="text-white/90 text-sm mb-1">
            • Lưu cân hàng và công nợ
          </Text>
          <Text className="text-white/90 text-sm">• Xem báo cáo tháng/năm</Text>
        </View>

        <TouchableOpacity
          onPress={handleContinue}
          className="bg-white rounded-2xl px-6 py-3 w-full"
        >
          <Text className="text-center text-emerald-600 font-bold text-lg">
            Bắt đầu ngay
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
});
