import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal, Animated, StatusBar, StyleSheet } from 'react-native';
import { listBuyers, createBuyer, deleteBuyer, updateBuyer } from '../services/buyers';
import { useNavigation } from '@react-navigation/native';

export default function BuyerList() {
  const [buyers, setBuyers] = useState([]);
  const [filteredBuyers, setFilteredBuyers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const load = async () => {
    const data = await listBuyers();
    setBuyers(data);
    setFilteredBuyers(data);
    // Trigger animation for list
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (search.trim()) {
      const filtered = buyers.filter(b => 
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        (b.phone && b.phone.includes(search))
      );
      setFilteredBuyers(filtered);
    } else {
      setFilteredBuyers(buyers);
    }
  }, [search, buyers]);

  const openModal = (buyer = null) => {
    setEditingBuyer(buyer);
    setName(buyer?.name || '');
    setPhone(buyer?.phone || '');
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
      setEditingBuyer(null);
      setName('');
      setPhone('');
    });
  };

  const onSave = async () => {
    if (!name.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên chủ nhóm/ghe/xe');
    
    if (editingBuyer) {
      await updateBuyer({ ...editingBuyer, name: name.trim(), phone: phone.trim() });
    } else {
      await createBuyer({ name: name.trim(), phone: phone.trim() });
    }
    
    closeModal();
    load();
  };

  const onDelete = async (id) => {
    Alert.alert('Xoá người mua', 'Bạn có chắc muốn xoá?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => { await deleteBuyer(id); load(); } },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      
      {/* Header với gradient */}
      <View className="bg-emerald-500 pt-12 pb-6 px-5 rounded-b-3xl shadow-lg">
        <Text className="text-3xl font-bold text-white mb-2">🌾 Cân Lúa</Text>
        <Text className="text-emerald-100 text-sm mb-4">Quản lý mua bán lúa gạo</Text>
        
        {/* Search bar */}
        <View className="bg-white rounded-2xl flex-row items-center px-4 py-3 shadow">
          <Text className="text-xl mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-base"
            placeholder="Tìm theo tên hoặc SĐT..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text className="text-gray-400 text-lg">✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{buyers.length}</Text>
          <Text style={styles.statLabel}>Tổng số ghe</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, {color: '#2563eb'}]}>{buyers.reduce((sum, b) => sum + (b.totals?.weighCount || 0), 0)}</Text>
          <Text style={styles.statLabel}>Tổng lần cân</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, {color: '#d97706'}]}>{buyers.reduce((sum, b) => sum + (b.totals?.weightKg || 0), 0)}</Text>
          <Text style={styles.statLabel}>Tổng kg</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredBuyers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
              onPress={() => navigation.navigate('BuyerDetail', { buyerId: item.id })}
              style={styles.buyerCard}
              activeOpacity={0.7}
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-xl mr-2">🚜</Text>
                    <Text className="text-lg font-bold text-gray-800 flex-1">{item.name}</Text>
                  </View>
                  <Text className="text-gray-400 text-xs">📅 {new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openModal(item)}
                  className="bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  <Text className="text-blue-600 text-xs font-semibold">✏️ Sửa</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statsRow}>
                <View className="flex-1 bg-emerald-50 rounded-xl p-3">
                  <Text className="text-emerald-700 font-bold text-base">{item.totals?.weightKg || 0} kg</Text>
                  <Text className="text-emerald-600 text-xs">Khối lượng</Text>
                </View>
                <View className="flex-1 bg-blue-50 rounded-xl p-3">
                  <Text className="text-blue-700 font-bold text-base">{item.totals?.weighCount || 0}</Text>
                  <Text className="text-blue-600 text-xs">Lần cân</Text>
                </View>
              </View>

              {item.phone ? (
                <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-2">
                  <Text className="text-base mr-2">📞</Text>
                  <Text className="text-gray-600 text-sm">{item.phone}</Text>
                </View>
              ) : null}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('BuyerDetail', { buyerId: item.id })}
                  className="flex-1 bg-emerald-500 rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-semibold">Mở chi tiết →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDelete(item.id)}
                  className="bg-red-50 px-4 rounded-xl items-center justify-center"
                >
                  <Text className="text-red-600 text-lg">🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-6xl mb-4">📦</Text>
            <Text className="text-gray-400 text-base">Chưa có người mua nào</Text>
            <Text className="text-gray-300 text-sm mt-1">Nhấn nút + để thêm mới</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => openModal()}
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
            <Text className="text-2xl font-bold text-gray-800 mb-1">
              {editingBuyer ? '✏️ Sửa thông tin' : '➕ Thêm người mua'}
            </Text>
            <Text className="text-gray-400 text-sm mb-6">Nhập thông tin chủ nhóm/ghe/xe</Text>

            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Tên <Text className="text-red-500">*</Text></Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-base border border-gray-200"
                placeholder="Nhập tên chủ ghe..."
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Số điện thoại</Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-base border border-gray-200"
                placeholder="Nhập số điện thoại..."
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
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
                onPress={onSave}
                className="flex-1 bg-emerald-500 rounded-xl py-4 items-center shadow"
              >
                <Text className="text-white font-bold text-base">{editingBuyer ? 'Cập nhật' : 'Thêm mới'}</Text>
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  buyerCard: {
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
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
