import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { listBuyers } from '../services/buyers';
import { getSettings } from '../services/settings';
import { getTransactionStats } from '../services/transactions';
import BannerAd from '../components/BannerAd';
import { useInterstitialAd } from '../components/InterstitialAd';
import { formatMoney, formatWeight } from '../utils/numberUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function StatisticsScreen() {
  useInterstitialAd(); // Show interstitial ad

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [buyers, setBuyers] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [transactionStats, setTransactionStats] = useState({
    income: 0,
    expense: 0,
    profit: 0,
  });

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  // Reload data when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [selectedYear]),
  );

  const loadData = async () => {
    const buyersData = await listBuyers();

    // Buyers already have totals from database
    // Seller/weighing data temporarily disabled until migrated to SQLite
    const buyersWithTotals = buyersData.map(buyer => ({
      ...buyer,
      totals: buyer.totals || {
        weightKg: 0,
        bags: 0,
      },
    }));

    setBuyers(buyersWithTotals);

    // Get monthly stats
    const monthly = await getMonthlyStats(selectedYear);
    setMonthlyData(monthly);

    // Get transaction stats
    const txStats = await getTransactionStats(selectedYear);
    setTransactionStats(txStats);
  };

  const getMonthlyStats = async year => {
    // Temporarily return empty data until weighing is migrated to SQLite
    const data = Array(12)
      .fill(0)
      .map((_, i) => ({ month: i + 1, kg: 0, bags: 0 }));
    return data;
  };

  const totalKg = monthlyData.reduce((sum, m) => sum + m.kg, 0);
  const totalBags = monthlyData.reduce((sum, m) => sum + m.bags, 0);

  const chartConfig = {
    backgroundColor: '#10b981',
    backgroundGradientFrom: '#10b981',
    backgroundGradientTo: '#059669',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#059669' },
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-emerald-500 pt-12 pb-6 px-5 rounded-b-3xl">
        <Text className="text-3xl font-bold text-white mb-2">📊 Thống kê</Text>
        <Text className="text-emerald-100">Tổng quan hoạt động</Text>
      </View>

      {/* Banner Ad */}
      <BannerAd />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Year Selector */}
        <View className="flex-row items-center justify-center px-5 mt-4 mb-2">
          <TouchableOpacity
            onPress={() => setSelectedYear(selectedYear - 1)}
            className="bg-blue-500 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-bold">← {selectedYear - 1}</Text>
          </TouchableOpacity>

          <View
            className="mx-4 bg-white px-6 py-3 rounded-xl"
            style={styles.shadow}
          >
            <Text className="text-2xl font-bold text-emerald-600">
              {selectedYear}
            </Text>
          </View>

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
              {selectedYear + 1} →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text className="text-4xl mb-2">🌾</Text>
            <Text className="text-3xl font-bold text-emerald-600">
              {formatWeight(totalKg)}
            </Text>
            <Text className="text-gray-600 text-sm mt-1">Tổng kg</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text className="text-4xl mb-2">📦</Text>
            <Text className="text-3xl font-bold text-blue-600">
              {totalBags}
            </Text>
            <Text className="text-gray-600 text-sm mt-1">Tổng bao</Text>
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text className="text-4xl mb-2">💰</Text>
            <Text className="text-2xl font-bold text-green-600">
              {formatMoney(transactionStats.income)}
            </Text>
            <Text className="text-gray-600 text-sm mt-1">Thu (đ)</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text className="text-4xl mb-2">💸</Text>
            <Text className="text-2xl font-bold text-red-600">
              {formatMoney(transactionStats.expense)}
            </Text>
            <Text className="text-gray-600 text-sm mt-1">Chi (đ)</Text>
          </View>
        </View>

        <View
          className="mx-5 mb-4 bg-white rounded-2xl p-5"
          style={styles.shadow}
        >
          <Text className="text-4xl mb-2 text-center">📈</Text>
          <Text
            className="text-3xl font-bold text-center"
            style={{
              color: transactionStats.profit >= 0 ? '#10b981' : '#ef4444',
            }}
          >
            {formatMoney(transactionStats.profit)} đ
          </Text>
          <Text className="text-gray-600 text-sm mt-1 text-center">
            Lợi nhuận
          </Text>
        </View>

        {/* Monthly Weight Chart */}
        <View
          className="mx-5 mb-4 bg-white rounded-2xl p-4"
          style={styles.shadow}
        >
          <Text className="text-lg font-bold text-gray-800 mb-3">
            📊 Khối lượng theo tháng (kg)
          </Text>
          {monthlyData.length > 0 && (
            <LineChart
              data={{
                labels: [
                  'T1',
                  'T2',
                  'T3',
                  'T4',
                  'T5',
                  'T6',
                  'T7',
                  'T8',
                  'T9',
                  'T10',
                  'T11',
                  'T12',
                ],
                datasets: [{ data: monthlyData.map(m => m.kg || 0.1) }],
              }}
              width={SCREEN_WIDTH - 70}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: 16 }}
            />
          )}
        </View>

        {/* Monthly Bags Count Chart */}
        <View
          className="mx-5 mb-4 bg-white rounded-2xl p-4"
          style={styles.shadow}
        >
          <Text className="text-lg font-bold text-gray-800 mb-3">
            📦 Số bao theo tháng
          </Text>
          {monthlyData.length > 0 && (
            <BarChart
              data={{
                labels: [
                  'T1',
                  'T2',
                  'T3',
                  'T4',
                  'T5',
                  'T6',
                  'T7',
                  'T8',
                  'T9',
                  'T10',
                  'T11',
                  'T12',
                ],
                datasets: [{ data: monthlyData.map(m => m.bags || 0.1) }],
              }}
              width={SCREEN_WIDTH - 70}
              height={220}
              chartConfig={chartConfig}
              style={{ borderRadius: 16 }}
            />
          )}
        </View>

        {/* Buyer Stats */}
        <View
          className="mx-5 mb-4 bg-white rounded-2xl p-5"
          style={styles.shadow}
        >
          <Text className="text-lg font-bold text-gray-800 mb-3">
            👥 Top người mua
          </Text>
          {buyers.length > 0 ? (
            buyers
              .sort(
                (a, b) => (b.totals?.weightKg || 0) - (a.totals?.weightKg || 0),
              )
              .slice(0, 5)
              .map((buyer, index) => (
                <View
                  key={buyer.id}
                  className="flex-row items-center justify-between py-3 border-b border-gray-100"
                >
                  <View className="flex-row items-center flex-1">
                    <Text className="text-2xl mr-3">
                      {index === 0
                        ? '🥇'
                        : index === 1
                        ? '🥈'
                        : index === 2
                        ? '🥉'
                        : '👤'}
                    </Text>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-800">
                        {buyer.name}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {buyer.totals?.bags || 0} bao •{' '}
                        {formatWeight(buyer.totals?.weightKg || 0)} kg
                      </Text>
                    </View>
                  </View>
                  <Text className="font-bold text-emerald-600">
                    {formatWeight(buyer.totals?.weightKg || 0)} kg
                  </Text>
                </View>
              ))
          ) : (
            <Text className="text-gray-400 text-center py-4">
              Chưa có dữ liệu
            </Text>
          )}
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});
