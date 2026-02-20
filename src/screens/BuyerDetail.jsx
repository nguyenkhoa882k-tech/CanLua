import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Animated,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getBuyer } from '../services/buyers';
import {
  getSettings,
  getSettingValue,
  setSettingValue,
} from '../services/settings';
import { MoneyInput } from '../components/MoneyInput';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { formatMoney, formatWeight } from '../utils/numberUtils';

const genId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function BuyerDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { buyerId } = route.params || {};
  const [buyer, setBuyer] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [totalBags, setTotalBags] = useState(0);
  const [totalKg, setTotalKg] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const loadData = async () => {
    const b = await getBuyer(buyerId);
    setBuyer(b);
    const sellersData = (await getSettingValue(`sellers_${buyerId}`)) || [];

    // Get settings for correct divisor
    const settings = await getSettings();
    const digitDivisor = settings && settings.fourDigitInput ? 100 : 10;

    let totalBagsCount = 0;
    let totalKgCount = 0;

    // Load confirmed status and calculate totals for each seller
    const sellersWithStatus = await Promise.all(
      sellersData.map(async seller => {
        const weighKey = `weighing_${buyerId}_${seller.id}`;
        const weighData = await getSettingValue(weighKey);

        // Calculate totals regardless of confirmed status
        if (weighData && weighData.tables) {
          const tables = weighData.tables || [];

          // Calculate total kg and bags from all tables for this seller
          let sellerKg = 0;
          let sellerBags = 0;

          for (const table of tables) {
            const tableWeight = table.rows.reduce((rowSum, row) => {
              return (
                rowSum +
                Object.values(row).reduce(
                  (cellSum, val) => cellSum + (Number(val) || 0) / digitDivisor,
                  0,
                )
              );
            }, 0);

            sellerKg += tableWeight;

            // Count filled cells as bags
            for (const row of table.rows) {
              if (row.a && Number(row.a) > 0) sellerBags++;
              if (row.b && Number(row.b) > 0) sellerBags++;
              if (row.c && Number(row.c) > 0) sellerBags++;
              if (row.d && Number(row.d) > 0) sellerBags++;
              if (row.e && Number(row.e) > 0) sellerBags++;
            }
          }

          // Add to totals (không cần kiểm tra confirmed)
          totalKgCount += sellerKg;
          totalBagsCount += sellerBags;
        }

        return {
          ...seller,
          confirmed: weighData?.confirmed || false,
        };
      }),
    );

    console.log('📦 BuyerDetail - Total bags:', totalBagsCount);
    console.log(
      '📦 BuyerDetail - Total kg:',
      Math.round(totalKgCount * 10) / 10,
    );

    setSellers(sellersWithStatus);
    setTotalBags(totalBagsCount);
    setTotalKg(Math.round(totalKgCount * 10) / 10);
  };

  // Load data on mount and when buyerId changes
  useEffect(() => {
    loadData();
  }, [buyerId]);

  // Setup navigation listener separately
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return () => unsub();
  }, [navigation]);

  const openModal = () => {
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setName('');
      setPrice('');
    });
  };

  const onAddSeller = async () => {
    if (!name.trim())
      return showAlert('Thiếu thông tin', 'Vui lòng nhập tên người bán');
    if (!price.trim())
      return showAlert('Thiếu thông tin', 'Vui lòng nhập đơn giá');
    const seller = {
      id: genId(),
      name: name.trim(),
      unitPrice: price ? Number(price) : null,
      createdAt: new Date().toISOString(),
    };
    const updated = [seller, ...sellers];
    await setSettingValue(`sellers_${buyerId}`, updated);
    setSellers(updated);
    closeModal();
  };

  const onDeleteSeller = async id => {
    showAlert('Xoá người bán', 'Bạn có chắc muốn xoá?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          const updated = sellers.filter(s => s.id !== id);
          await setSettingValue(`sellers_${buyerId}`, updated);
          setSellers(updated);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />

      {/* Header */}
      <View className="bg-emerald-500 pt-10 pb-4 px-4 rounded-b-2xl shadow-lg">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-2">
          <Text className="text-white text-xl">← Quay lại</Text>
        </TouchableOpacity>
        <View className="flex-row items-center mb-1">
          <Text className="text-lg mr-2">🚜</Text>
          <Text className="text-xl font-bold text-white flex-1">
            {buyer?.name}
          </Text>
        </View>
        <Text className="text-emerald-100 text-xs">Quản lý người bán lúa</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text className="text-xl font-bold text-emerald-600">
            {sellers.length}
          </Text>
          <Text className="text-gray-500 text-xs mt-0.5">Người bán</Text>
        </View>
        <View style={styles.statCard}>
          <Text className="text-xl font-bold text-blue-600">{totalBags}</Text>
          <Text className="text-gray-500 text-xs mt-0.5">Tổng bao</Text>
        </View>
        <View style={styles.statCard}>
          <Text className="text-xl font-bold text-amber-600">
            {formatWeight(totalKg)}
          </Text>
          <Text className="text-gray-500 text-xs mt-0.5">Tổng kg</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={sellers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('SellerDetail', { buyerId, seller: item })
            }
            style={styles.sellerCard}
            activeOpacity={0.7}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <View className="flex-row items-center mb-0.5">
                  <Text className="text-lg mr-1.5">👤</Text>
                  <Text className="text-base font-bold text-gray-800 flex-1">
                    {item.name}
                  </Text>
                  {item.confirmed && (
                    <View className="bg-green-100 px-1.5 py-0.5 rounded-full ml-2">
                      <Text className="text-green-700 text-xs font-bold">
                        ✅
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-gray-400 text-xs">
                  📅 {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onDeleteSeller(item.id)}
                className="bg-red-50 px-2 py-1 rounded-lg"
              >
                <Text className="text-red-600 text-xs font-semibold">
                  🗑️ Xoá
                </Text>
              </TouchableOpacity>
            </View>

            {item.unitPrice != null && (
              <View className="bg-emerald-50 rounded-lg p-2 mb-2">
                <Text className="text-emerald-700 font-bold text-sm">
                  {formatMoney(item.unitPrice)} đ/kg
                </Text>
                <Text className="text-emerald-600 text-xs">Đơn giá</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() =>
                navigation.navigate('SellerDetail', { buyerId, seller: item })
              }
              className="bg-emerald-500 rounded-lg py-2 items-center"
            >
              <Text className="text-white font-semibold text-sm">
                Mở chi tiết cân lúa →
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center mt-16">
            <Text className="text-5xl mb-3">👥</Text>
            <Text className="text-gray-400 text-sm">Chưa có người bán nào</Text>
            <Text className="text-gray-300 text-xs mt-1">
              Nhấn nút + để thêm người bán
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={openModal}
        className="absolute bottom-5 right-5 bg-emerald-500 w-14 h-14 rounded-full items-center justify-center shadow-2xl"
        activeOpacity={0.8}
      >
        <Text className="text-white text-2xl font-bold">+</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="bg-white rounded-2xl p-5 shadow-2xl"
          >
            <Text className="text-xl font-bold text-gray-800 mb-1">
              ➕ Thêm người bán
            </Text>
            <Text className="text-gray-400 text-xs mb-4">
              Nhập thông tin người bán lúa
            </Text>

            <View className="mb-3">
              <Text className="text-gray-700 font-semibold mb-1.5 text-sm">
                Tên người bán <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200"
                placeholder="Nhập tên người bán..."
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-1.5 text-sm">
                Đơn giá (đ/kg)
              </Text>
              <MoneyInput
                className="bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200"
                placeholder="Nhập đơn giá..."
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={closeModal}
                className="flex-1 bg-gray-100 rounded-lg py-3 items-center"
              >
                <Text className="text-gray-700 font-semibold text-sm">Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onAddSeller}
                className="flex-1 bg-emerald-500 rounded-lg py-3 items-center shadow"
              >
                <Text className="text-white font-bold text-sm">Thêm mới</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  sellerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
    gap: 10,
  },
});
