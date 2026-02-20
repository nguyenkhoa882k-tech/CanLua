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
  ScrollView,
} from 'react-native';
import {
  listBuyers,
  createBuyer,
  deleteBuyer,
  updateBuyer,
} from '../services/buyers';
import { getSettings, getSettingValue } from '../services/settings';
import BannerAd from '../components/BannerAd';
import SimpleDatePicker from '../components/SimpleDatePicker';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { formatWeight } from '../utils/numberUtils';

export default function BuyerList() {
  const [buyers, setBuyers] = useState([]);
  const [filteredBuyers, setFilteredBuyers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'year', 'custom'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const loadBuyers = async () => {
    const data = await listBuyers();

    // Get settings for correct divisor
    const settings = await getSettings();
    const digitDivisor = settings && settings.fourDigitInput ? 100 : 10;

    // Calculate totals for each buyer from weighing data
    const buyersWithTotals = await Promise.all(
      data.map(async buyer => {
        const sellersData =
          (await getSettingValue(`sellers_${buyer.id}`)) || [];
        let totalKg = 0;
        let totalBags = 0;

        // Calculate from all sellers' weighing data
        for (const seller of sellersData) {
          const weighKey = `weighing_${buyer.id}_${seller.id}`;
          const weighData = await getSettingValue(weighKey);

          if (weighData && weighData.tables) {
            const tables = weighData.tables || [];

            for (const table of tables) {
              const tableWeight = table.rows.reduce((rowSum, row) => {
                return (
                  rowSum +
                  Object.values(row).reduce(
                    (cellSum, val) =>
                      cellSum + (Number(val) || 0) / digitDivisor,
                    0,
                  )
                );
              }, 0);

              totalKg += tableWeight;

              // Count filled cells as bags
              for (const row of table.rows) {
                if (row.a && Number(row.a) > 0) totalBags++;
                if (row.b && Number(row.b) > 0) totalBags++;
                if (row.c && Number(row.c) > 0) totalBags++;
                if (row.d && Number(row.d) > 0) totalBags++;
                if (row.e && Number(row.e) > 0) totalBags++;
              }
            }
          }
        }

        return {
          ...buyer,
          totals: {
            weightKg: Math.round(totalKg * 10) / 10,
            weighCount: totalBags,
          },
        };
      }),
    );

    setBuyers(buyersWithTotals);
    setFilteredBuyers(buyersWithTotals);
    // Trigger animation for list
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
  };

  // Load buyers on mount
  useEffect(() => {
    loadBuyers();
  }, []);

  // Reload buyers when screen focuses (after confirming weighing)
  useFocusEffect(
    React.useCallback(() => {
      loadBuyers();
    }, []),
  );

  useEffect(() => {
    applyFilters();
  }, [search, buyers, filterType, selectedYear, fromDate, toDate]);

  const applyFilters = () => {
    let filtered = buyers;

    // Apply search filter
    if (search.trim()) {
      filtered = filtered.filter(
        b =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          (b.phone && b.phone.includes(search)),
      );
    }

    // Apply date filter
    if (filterType === 'year') {
      filtered = filtered.filter(b => {
        const buyerYear = new Date(b.createdAt).getFullYear();
        return buyerYear === selectedYear;
      });
    } else if (filterType === 'custom') {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      filtered = filtered.filter(b => {
        const buyerDate = new Date(b.createdAt);
        return buyerDate >= from && buyerDate <= to;
      });
    }

    setFilteredBuyers(filtered);
  };

  const handleApplyFilter = () => {
    applyFilters();
    setFilterModalVisible(false);
  };

  const handleResetFilter = () => {
    setFilterType('all');
    setSelectedYear(new Date().getFullYear());
    setFromDate(new Date());
    setToDate(new Date());
    setFilterModalVisible(false);
  };

  const openModal = (buyer = null) => {
    setEditingBuyer(buyer);
    setName(buyer?.name || '');
    setPhone(buyer?.phone || '');
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
      setEditingBuyer(null);
      setName('');
      setPhone('');
    });
  };

  const onSave = async () => {
    if (!name.trim())
      return showAlert('Thiếu thông tin', 'Vui lòng nhập tên chủ nhóm/ghe/xe');

    if (editingBuyer) {
      await updateBuyer({
        ...editingBuyer,
        name: name.trim(),
        phone: phone.trim(),
      });
    } else {
      await createBuyer({ name: name.trim(), phone: phone.trim() });
    }

    closeModal();
    loadBuyers();
  };

  const onDelete = async id => {
    showAlert('Xoá người mua', 'Bạn có chắc muốn xoá?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          await deleteBuyer(id);
          loadBuyers();
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />

      {/* Header với gradient */}
      <View className="bg-emerald-500 pt-5 pb-4 px-4 rounded-b-2xl shadow-lg">
        <Text className="text-2xl font-bold text-white mb-1">🌾 Cân Lúa</Text>
        <Text className="text-emerald-100 text-xs mb-3">
          Quản lý mua bán lúa gạo
        </Text>

        {/* Search bar with filter */}
        <View className="flex-row" style={{ gap: 6 }}>
          <View className="flex-1 bg-white rounded-xl flex-row items-center px-3 py-2 shadow">
            <Text className="text-lg mr-2">🔍</Text>
            <TextInput
              className="flex-1 text-sm"
              placeholder="Tìm theo tên hoặc SĐT..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text className="text-gray-400 text-base">✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            className={`bg-white rounded-xl px-3 py-2 shadow items-center justify-center ${
              filterType !== 'all' ? 'border-2 border-blue-500' : ''
            }`}
          >
            <Text className="text-lg">🔽</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Indicator */}
      {filterType !== 'all' && (
        <View className="mx-4 mt-2 bg-blue-100 rounded-lg p-2 flex-row items-center justify-between">
          <Text className="text-blue-700 font-semibold text-xs">
            {filterType === 'year'
              ? `📅 Lọc theo năm: ${selectedYear}`
              : `🗓️ Từ ${fromDate.toLocaleDateString(
                  'vi-VN',
                )} đến ${toDate.toLocaleDateString('vi-VN')}`}
          </Text>
          <TouchableOpacity onPress={handleResetFilter}>
            <Text className="text-blue-700 font-bold text-base">✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{filteredBuyers.length}</Text>
          <Text style={styles.statLabel}>
            {filterType !== 'all' ? 'Kết quả' : 'Tổng ghe'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#2563eb' }]}>
            {filteredBuyers.reduce(
              (sum, b) => sum + (b.totals?.weighCount || 0),
              0,
            )}
          </Text>
          <Text style={styles.statLabel}>Tổng bao</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#d97706' }]}>
            {formatWeight(
              filteredBuyers.reduce(
                (sum, b) => sum + (b.totals?.weightKg || 0),
                0,
              ),
            )}
          </Text>
          <Text style={styles.statLabel}>Tổng kg</Text>
        </View>
      </View>

      {/* Banner Ad */}
      <BannerAd />

      {/* List */}
      <FlatList
        data={filteredBuyers}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('BuyerDetail', { buyerId: item.id })
            }
            style={styles.buyerCard}
            activeOpacity={0.7}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-lg font-bold text-gray-800">
                    {item.name}
                  </Text>
                  {item.sellers?.some(s => s.confirmed) && (
                    <View className="ml-2 bg-green-100 px-1.5 py-0.5 rounded-full">
                      <Text className="text-green-700 text-xs font-bold">
                        ✅
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-gray-500 text-xs">
                  📅 {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => openModal(item)}
                className="bg-blue-50 px-2 py-1 rounded-lg"
              >
                <Text className="text-blue-600 text-xs font-semibold">
                  ✏️ Sửa
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <View className="flex-1 bg-emerald-50 rounded-lg p-2">
                <Text className="text-emerald-700 font-bold text-sm">
                  {formatWeight(item.totals?.weightKg || 0)} kg
                </Text>
                <Text className="text-emerald-600 text-xs">Tổng kg</Text>
              </View>
              <View className="flex-1 bg-blue-50 rounded-lg p-2">
                <Text className="text-blue-700 font-bold text-sm">
                  {item.totals?.weighCount || 0}
                </Text>
                <Text className="text-blue-600 text-xs">Tổng bao</Text>
              </View>
            </View>

            {item.phone ? (
              <View className="flex-row items-center bg-gray-50 rounded-lg px-2 py-1.5 mt-2">
                <Text className="text-sm mr-1">📞</Text>
                <Text className="text-gray-600 text-xs">{item.phone}</Text>
              </View>
            ) : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('BuyerDetail', { buyerId: item.id })
                }
                className="flex-1 bg-emerald-500 rounded-lg py-2 items-center"
              >
                <Text className="text-white font-semibold text-sm">
                  Mở chi tiết →
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDelete(item.id)}
                className="bg-red-50 px-3 rounded-lg items-center justify-center"
              >
                <Text className="text-red-600 text-base">🗑️</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center mt-16">
            <Text className="text-5xl mb-3">📦</Text>
            <Text className="text-gray-400 text-sm">Chưa có người mua nào</Text>
            <Text className="text-gray-300 text-xs mt-1">
              Nhấn nút + để thêm mới
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => openModal()}
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
            className="bg-white rounded-3xl p-6 shadow-2xl"
          >
            <Text className="text-2xl font-bold text-gray-800 mb-1">
              {editingBuyer ? '✏️ Sửa thông tin' : '➕ Thêm người mua'}
            </Text>
            <Text className="text-gray-400 text-sm mb-6">
              Nhập thông tin chủ nhóm/ghe/xe
            </Text>

            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">
                Tên <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-base border border-gray-200"
                placeholder="Nhập tên chủ ghe..."
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">
                Số điện thoại
              </Text>
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
                <Text className="text-gray-700 font-semibold text-base">
                  Huỷ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSave}
                className="flex-1 bg-emerald-500 rounded-xl py-4 items-center shadow"
              >
                <Text className="text-white font-bold text-base">
                  {editingBuyer ? 'Cập nhật' : 'Thêm mới'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View className="bg-white rounded-3xl p-6 max-w-md w-full">
            <Text className="text-2xl font-bold text-gray-800 mb-4">
              🔽 Lọc danh sách
            </Text>

            {/* Filter Type Selection */}
            <View className="mb-4">
              <TouchableOpacity
                onPress={() => setFilterType('all')}
                className={`p-4 rounded-xl mb-3 ${
                  filterType === 'all' ? 'bg-emerald-500' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    filterType === 'all' ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  📋 Tất cả
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFilterType('year')}
                className={`p-4 rounded-xl mb-3 ${
                  filterType === 'year' ? 'bg-emerald-500' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    filterType === 'year' ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  📅 Lọc theo năm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFilterType('custom')}
                className={`p-4 rounded-xl ${
                  filterType === 'custom' ? 'bg-emerald-500' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    filterType === 'custom' ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  🗓️ Tùy chọn (từ ngày - đến ngày)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Year Selector */}
            {filterType === 'year' && (
              <View className="mb-4 bg-blue-50 rounded-xl p-4">
                <Text className="text-gray-700 font-semibold mb-3">
                  Chọn năm:
                </Text>
                <View className="flex-row items-center justify-center">
                  <TouchableOpacity
                    onPress={() => setSelectedYear(selectedYear - 1)}
                    className="bg-blue-500 px-4 py-2 rounded-xl"
                  >
                    <Text className="text-white font-bold">←</Text>
                  </TouchableOpacity>
                  <Text className="text-2xl font-bold mx-6">
                    {selectedYear}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedYear(selectedYear + 1)}
                    disabled={selectedYear >= new Date().getFullYear()}
                    className={`px-4 py-2 rounded-xl ${
                      selectedYear >= new Date().getFullYear()
                        ? 'bg-gray-300'
                        : 'bg-blue-500'
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        selectedYear >= new Date().getFullYear()
                          ? 'text-gray-500'
                          : 'text-white'
                      }`}
                    >
                      →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Custom Date Range */}
            {filterType === 'custom' && (
              <ScrollView
                className="mb-4 bg-purple-50 rounded-xl p-4"
                style={{ maxHeight: 300 }}
              >
                <Text className="text-gray-700 font-semibold mb-2">
                  Từ ngày:
                </Text>
                <SimpleDatePicker value={fromDate} onChange={setFromDate} />

                <Text className="text-gray-700 font-semibold mb-2 mt-4">
                  Đến ngày:
                </Text>
                <SimpleDatePicker value={toDate} onChange={setToDate} />
              </ScrollView>
            )}

            {/* Buttons */}
            <View className="flex-row" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handleResetFilter}
                className="flex-1 bg-gray-100 rounded-xl py-4"
              >
                <Text className="text-gray-700 text-center font-bold">
                  Đặt lại
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApplyFilter}
                className="flex-1 bg-emerald-500 rounded-xl py-4"
              >
                <Text className="text-white text-center font-bold">
                  Áp dụng
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  buyerCard: {
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
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
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
