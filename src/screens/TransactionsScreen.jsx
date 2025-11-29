import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import SimpleDatePicker from '../components/SimpleDatePicker';
import { PieChart } from 'react-native-chart-kit';
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  INCOME_TYPES,
  EXPENSE_TYPES,
} from '../services/transactions';
import { MoneyInput } from '../components/MoneyInput';
import BannerAd from '../components/BannerAd';
import { useInterstitialAd } from '../components/InterstitialAd';
import { formatMoney } from '../utils/numberUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TransactionsScreen() {
  useInterstitialAd(); // Show interstitial ad
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const [transactions, setTransactions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [type, setType] = useState('income'); // 'income' or 'expense'
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'income', 'expense'

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const data = await listTransactions();
    setTransactions(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  const openModal = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setType(transaction.type);
      setCategory(transaction.category);
      setAmount(String(transaction.amount));
      setDate(new Date(transaction.date));
      setNote(transaction.note || '');
    } else {
      setEditingTransaction(null);
      setType('income');
      setCategory('');
      setAmount('');
      setDate(new Date());
      setNote('');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTransaction(null);
  };

  const handleSave = async () => {
    if (!category || !amount) {
      showAlert({
        title: 'Lỗi',
        message: 'Vui lòng điền đầy đủ thông tin',
        buttons: [{ text: 'OK', onPress: hideAlert }],
      });
      return;
    }

    const transactionData = {
      type,
      category,
      amount: Number(amount),
      date: date.toISOString().split('T')[0],
      note,
    };

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, transactionData);
    } else {
      await createTransaction(transactionData);
    }

    await loadTransactions();
    closeModal();
  };

  const handleDelete = async id => {
    showAlert({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc muốn xóa giao dịch này?',
      buttons: [
        { text: 'Hủy', onPress: hideAlert },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            hideAlert();
            await deleteTransaction(id);
            await loadTransactions();
          },
        },
      ],
    });
  };

  const filteredTransactions = transactions.filter(
    t => filter === 'all' || t.type === filter,
  );

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Pie chart data
  const incomeByCategory = {};
  const expenseByCategory = {};

  transactions.forEach(t => {
    if (t.type === 'income') {
      incomeByCategory[t.category] =
        (incomeByCategory[t.category] || 0) + Number(t.amount);
    } else {
      expenseByCategory[t.category] =
        (expenseByCategory[t.category] || 0) + Number(t.amount);
    }
  });

  const pieColors = [
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
  ];

  const incomePieData = Object.entries(incomeByCategory).map(
    ([name, amount], i) => ({
      name: `${name}: ${formatMoney(amount)}đ`,
      amount,
      color: pieColors[i % pieColors.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }),
  );

  const expensePieData = Object.entries(expenseByCategory).map(
    ([name, amount], i) => ({
      name: `${name}: ${formatMoney(amount)}đ`,
      amount,
      color: pieColors[i % pieColors.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }),
  );

  return (
    <View className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <View className="bg-emerald-500 pt-12 pb-6 px-5 rounded-b-3xl">
        <Text className="text-3xl font-bold text-white mb-2">💰 Thu Chi</Text>
        <Text className="text-emerald-100">Quản lý tài chính</Text>
      </View>

      {/* Banner Ad */}
      <BannerAd />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: '#d1fae5' }]}>
            <Text className="text-2xl mb-1">📈</Text>
            <Text className="text-xl font-bold text-green-700">
              {formatMoney(totalIncome)}
            </Text>
            <Text className="text-green-600 text-xs mt-1">Thu</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
            <Text className="text-2xl mb-1">📉</Text>
            <Text className="text-xl font-bold text-red-700">
              {formatMoney(totalExpense)}
            </Text>
            <Text className="text-red-600 text-xs mt-1">Chi</Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: balance >= 0 ? '#dbeafe' : '#fef3c7' },
            ]}
          >
            <Text className="text-2xl mb-1">💵</Text>
            <Text
              className={`text-xl font-bold ${
                balance >= 0 ? 'text-blue-700' : 'text-yellow-700'
              }`}
            >
              {formatMoney(balance)}
            </Text>
            <Text
              className={`text-xs mt-1 ${
                balance >= 0 ? 'text-blue-600' : 'text-yellow-600'
              }`}
            >
              {balance >= 0 ? 'Lãi' : 'Lỗ'}
            </Text>
          </View>
        </View>

        {/* Charts */}
        {incomePieData.length > 0 && (
          <View
            className="mx-5 mb-4 bg-white rounded-2xl p-4"
            style={styles.shadow}
          >
            <Text className="text-lg font-bold text-gray-800 mb-3">
              📊 Thu theo loại
            </Text>
            <PieChart
              data={incomePieData}
              width={SCREEN_WIDTH - 70}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {expensePieData.length > 0 && (
          <View
            className="mx-5 mb-4 bg-white rounded-2xl p-4"
            style={styles.shadow}
          >
            <Text className="text-lg font-bold text-gray-800 mb-3">
              📊 Chi theo loại
            </Text>
            <PieChart
              data={expensePieData}
              width={SCREEN_WIDTH - 70}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Filter */}
        <View className="flex-row px-5 mb-4" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            className={`flex-1 py-3 rounded-xl ${
              filter === 'all' ? 'bg-emerald-500' : 'bg-gray-200'
            }`}
          >
            <Text
              className={`text-center font-bold ${
                filter === 'all' ? 'text-white' : 'text-gray-600'
              }`}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter('income')}
            className={`flex-1 py-3 rounded-xl ${
              filter === 'income' ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <Text
              className={`text-center font-bold ${
                filter === 'income' ? 'text-white' : 'text-gray-600'
              }`}
            >
              Thu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter('expense')}
            className={`flex-1 py-3 rounded-xl ${
              filter === 'expense' ? 'bg-red-500' : 'bg-gray-200'
            }`}
          >
            <Text
              className={`text-center font-bold ${
                filter === 'expense' ? 'text-white' : 'text-gray-600'
              }`}
            >
              Chi
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions List */}
        <View className="px-5">
          {filteredTransactions.map(transaction => (
            <View
              key={transaction.id}
              className="bg-white rounded-2xl p-4 mb-3"
              style={styles.shadow}
            >
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-xl mr-2">
                      {transaction.type === 'income' ? '📈' : '📉'}
                    </Text>
                    <Text className="font-bold text-gray-800 flex-1">
                      {transaction.category}
                    </Text>
                  </View>
                  <Text className="text-gray-500 text-xs">
                    📅 {new Date(transaction.date).toLocaleDateString('vi-VN')}
                  </Text>
                  {transaction.note ? (
                    <Text className="text-gray-600 text-sm mt-1">
                      📝 {transaction.note}
                    </Text>
                  ) : null}
                </View>
                <Text
                  className={`text-xl font-bold ${
                    transaction.type === 'income'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatMoney(Number(transaction.amount))}
                </Text>
              </View>
              <View className="flex-row" style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={() => openModal(transaction)}
                  className="flex-1 bg-blue-50 py-2 rounded-xl"
                >
                  <Text className="text-blue-600 text-center font-semibold">
                    ✏️ Sửa
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(transaction.id)}
                  className="flex-1 bg-red-50 py-2 rounded-xl"
                >
                  <Text className="text-red-600 text-center font-semibold">
                    🗑️ Xóa
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filteredTransactions.length === 0 && (
            <View className="items-center py-10">
              <Text className="text-6xl mb-3">📊</Text>
              <Text className="text-gray-400 text-base">
                Chưa có giao dịch nào
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        onPress={() => openModal()}
        className="absolute bottom-20 right-5 bg-emerald-500 w-16 h-16 rounded-full items-center justify-center"
        style={styles.shadow}
      >
        <Text className="text-white text-3xl">+</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View className="bg-white rounded-3xl p-6 w-full max-w-md">
            <Text className="text-2xl font-bold text-gray-800 mb-4">
              {editingTransaction ? 'Sửa giao dịch' : 'Thêm giao dịch'}
            </Text>

            {/* Type Selection */}
            <View className="flex-row mb-4" style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setType('income');
                  setCategory('');
                }}
                className={`flex-1 py-3 rounded-xl ${
                  type === 'income' ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-center font-bold ${
                    type === 'income' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  📈 Thu
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setType('expense');
                  setCategory('');
                }}
                className={`flex-1 py-3 rounded-xl ${
                  type === 'expense' ? 'bg-red-500' : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-center font-bold ${
                    type === 'expense' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  📉 Chi
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category */}
            <Text className="text-gray-700 font-semibold mb-2">
              Loại {type === 'income' ? 'thu' : 'chi'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              <View className="flex-row" style={{ gap: 8 }}>
                {(type === 'income' ? INCOME_TYPES : EXPENSE_TYPES).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-xl ${
                      category === cat ? 'bg-emerald-500' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        category === cat ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Amount */}
            <Text className="text-gray-700 font-semibold mb-2">
              Số tiền (đ)
            </Text>
            <MoneyInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-base border border-gray-200 mb-4"
              placeholder="Nhập số tiền..."
              value={amount}
              onChangeText={setAmount}
            />

            {/* Date */}
            <Text className="text-gray-700 font-semibold mb-2">Ngày</Text>
            <SimpleDatePicker value={date} onChange={setDate} />

            {/* Note */}
            <Text className="text-gray-700 font-semibold mb-2">
              Ghi chú (tùy chọn)
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-base border border-gray-200 mb-6"
              placeholder="Nhập ghi chú..."
              value={note}
              onChangeText={setNote}
              multiline
            />

            {/* Buttons */}
            <View className="flex-row" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={closeModal}
                className="flex-1 bg-gray-100 rounded-xl py-4"
              >
                <Text className="text-gray-700 text-center font-bold">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 bg-emerald-500 rounded-xl py-4"
              >
                <Text className="text-white text-center font-bold">Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideAlert}
      />
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
