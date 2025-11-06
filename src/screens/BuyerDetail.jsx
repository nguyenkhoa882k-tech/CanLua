import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal, Animated, StatusBar, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getBuyer } from '../services/buyers';
import { storage } from '../services/storage';
import { MoneyInput } from '../components/MoneyInput';

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function BuyerDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { buyerId } = route.params || {};
  const [buyer, setBuyer] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const loadData = async () => {
    const b = await getBuyer(buyerId);
    setBuyer(b);
    const sellersData = await storage.get(`sellers_${buyerId}`) || [];
    setSellers(sellersData);
  };

  useEffect(() => {
    loadData();
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [buyerId, navigation]);

  const openModal = () => {
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 50, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setModalVisible(false);
      setName('');
      setPrice('');
    });
  };

  const onAddSeller = async () => {
    if (!name.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên người bán');
    const seller = {
      id: genId(),
      name: name.trim(),
      unitPrice: price ? Number(price) : null,
      createdAt: new Date().toISOString(),
    };
    const updated = [seller, ...sellers];
    await storage.set(`sellers_${buyerId}`, updated);
    setSellers(updated);
    closeModal();
  };

  const onDeleteSeller = async (id) => {
    Alert.alert('Xoá người bán', 'Bạn có chắc muốn xoá?', [
      { text: 'Huỷ', style: 'cancel' },
      { 
        text: 'Xoá', 
        style: 'destructive', 
        onPress: async () => {
          const updated = sellers.filter(s => s.id !== id);
          await storage.set(`sellers_${buyerId}`, updated);
          setSellers(updated);
        }
      },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      
      {/* Header */}
      <View className="bg-emerald-500 pt-12 pb-6 px-5 rounded-b-3xl shadow-lg">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-3">
          <Text className="text-white text-2xl">← Quay lại</Text>
        </TouchableOpacity>
        <View className="flex-row items-center mb-2">
          <Text className="text-xl mr-2">🚜</Text>
          <Text className="text-2xl font-bold text-white flex-1">{buyer?.name}</Text>
        </View>
        <Text className="text-emerald-100 text-sm">Quản lý người bán lúa</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text className="text-2xl font-bold text-emerald-600">{sellers.length}</Text>
          <Text className="text-gray-500 text-xs mt-1">Người bán</Text>
        </View>
        <View style={styles.statCard}>
          <Text className="text-2xl font-bold text-blue-600">{buyer?.totals?.weighCount || 0}</Text>
          <Text className="text-gray-500 text-xs mt-1">Lần cân</Text>
        </View>
        <View style={styles.statCard}>
          <Text className="text-2xl font-bold text-amber-600">{buyer?.totals?.weightKg || 0}</Text>
          <Text className="text-gray-500 text-xs mt-1">Tổng kg</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={sellers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('SellerDetail', { buyerId, seller: item })}
            style={styles.sellerCard}
            activeOpacity={0.7}
          >
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className="text-xl mr-2">👤</Text>
                  <Text className="text-lg font-bold text-gray-800 flex-1">{item.name}</Text>
                </View>
                <Text className="text-gray-400 text-xs">📅 {new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => onDeleteSeller(item.id)}
                className="bg-red-50 px-3 py-1.5 rounded-lg"
              >
                <Text className="text-red-600 text-xs font-semibold">🗑️ Xoá</Text>
              </TouchableOpacity>
            </View>

            {item.unitPrice != null && (
              <View className="bg-emerald-50 rounded-xl p-3 mb-3">
                <Text className="text-emerald-700 font-bold text-base">{item.unitPrice.toLocaleString()} đ/kg</Text>
                <Text className="text-emerald-600 text-xs">Đơn giá</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => navigation.navigate('SellerDetail', { buyerId, seller: item })}
              className="bg-emerald-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">Mở chi tiết cân lúa →</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-6xl mb-4">👥</Text>
            <Text className="text-gray-400 text-base">Chưa có người bán nào</Text>
            <Text className="text-gray-300 text-sm mt-1">Nhấn nút + để thêm người bán</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={openModal}
        className="absolute bottom-6 right-6 bg-emerald-500 w-16 h-16 rounded-full items-center justify-center shadow-2xl"
        activeOpacity={0.8}
      >
        <Text className="text-white text-3xl font-bold">+</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="bg-white rounded-3xl p-6 shadow-2xl"
          >
            <Text className="text-2xl font-bold text-gray-800 mb-1">➕ Thêm người bán</Text>
            <Text className="text-gray-400 text-sm mb-6">Nhập thông tin người bán lúa</Text>

            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Tên người bán <Text className="text-red-500">*</Text></Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-base border border-gray-200"
                placeholder="Nhập tên người bán..."
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Đơn giá (đ/kg)</Text>
              <MoneyInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-base border border-gray-200"
                placeholder="Nhập đơn giá (tuỳ chọn)..."
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={closeModal}
                className="flex-1 bg-gray-100 rounded-xl py-4 items-center"
              >
                <Text className="text-gray-700 font-semibold text-base">Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onAddSeller}
                className="flex-1 bg-emerald-500 rounded-xl py-4 items-center shadow"
              >
                <Text className="text-white font-bold text-base">Thêm mới</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sellerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
