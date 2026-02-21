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
import { getSettings, getSettingValue } from '../services/settings';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  // Reload data when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear]),
  );

  const loadData = async () => {
    const buyersData = await listBuyers();

    // Get settings for correct divisor
    const settings = await getSettings();
    const digitDivisor = settings && settings.fourDigitInput ? 100 : 10;

    // Calculate totals for each buyer from weighing data
    const buyersWithTotals = await Promise.all(
      buyersData.map(async buyer => {
        const sellersData =
          (await getSettingValue(`sellers_${buyer.id}`)) || [];
        let totalKg = 0;
        let totalBags = 0;

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
            bags: totalBags,
          },
        };
      }),
    );

    setBuyers(buyersWithTotals);

    // Get monthly stats
    const monthly = await getMonthlyStats(
      selectedYear,
      buyersData,
      digitDivisor,
    );
    setMonthlyData(monthly);

    // Get transaction stats
    const txStats = await getTransactionStats(selectedYear);
    setTransactionStats(txStats);
  };

  const getMonthlyStats = async (year, buyersData, digitDivisor) => {
    // Initialize data for 12 months
    const data = Array(12)
      .fill(0)
      .map((_, i) => ({ month: i + 1, kg: 0, bags: 0 }));

    // Calculate from all buyers
    for (const buyer of buyersData) {
      const sellersData = (await getSettingValue(`sellers_${buyer.id}`)) || [];

      for (const seller of sellersData) {
        const weighKey = `weighing_${buyer.id}_${seller.id}`;
        const weighData = await getSettingValue(weighKey);

        if (weighData && weighData.tables) {
          const tables = weighData.tables || [];

          for (const table of tables) {
            // Get month from table creation date (if exists) or use current month
            const tableDate = weighData.updatedAt
              ? new Date(weighData.updatedAt)
              : new Date();
            const tableYear = tableDate.getFullYear();
            const tableMonth = tableDate.getMonth(); // 0-11

            // Only count if it's the selected year
            if (tableYear === year) {
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

              data[tableMonth].kg += tableWeight;

              for (const row of table.rows) {
                if (row.a && Number(row.a) > 0) data[tableMonth].bags++;
                if (row.b && Number(row.b) > 0) data[tableMonth].bags++;
                if (row.c && Number(row.c) > 0) data[tableMonth].bags++;
                if (row.d && Number(row.d) > 0) data[tableMonth].bags++;
                if (row.e && Number(row.e) > 0) data[tableMonth].bags++;
              }
            }
          }
        }
      }
    }

    // Round kg values
    return data.map(d => ({
      ...d,
      kg: Math.round(d.kg * 10) / 10,
    }));
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
    <View className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <View className="bg-emerald-500 pt-10 pb-4 px-4 rounded-b-2xl">
        <Text className="text-2xl font-bold text-white mb-1">📊 Thống kê</Text>
        <Text className="text-emerald-100 text-xs">Tổng quan hoạt động</Text>
      </View>

      {/* Banner Ad */}
      <BannerAd />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Year Selector */}
        <View className="flex-row items-center justify-center px-4 mt-3 mb-2">
          <TouchableOpacity
            onPress={() => setSelectedYear(selectedYear - 1)}
            className="bg-blue-500 px-3 py-1.5 rounded-lg"
          >
            <Text className="text-white font-bold text-sm">
              ← {selectedYear - 1}
            </Text>
          </TouchableOpacity>

          <View
            className="mx-3 bg-white px-4 py-2 rounded-lg"
            style={styles.shadow}
          >
            <Text className="text-xl font-bold text-emerald-600">
              {selectedYear}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setSelectedYear(selectedYear + 1)}
            disabled={selectedYear >= new Date().getFullYear()}
            className={`px-3 py-1.5 rounded-lg ${
              selectedYear >= new Date().getFullYear()
                ? 'bg-gray-300'
                : 'bg-blue-500'
            }`}
          >
            <Text
              className={`font-bold text-sm ${
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
            <Text className="text-2xl mb-1">🌾</Text>
            <Text className="text-xl font-bold text-emerald-600">
              {formatWeight(totalKg)}
            </Text>
            <Text className="text-gray-600 text-xs mt-0.5">Tổng kg</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text className="text-2xl mb-1">📦</Text>
            <Text className="text-xl font-bold text-blue-600">{totalBags}</Text>
            <Text className="text-gray-600 text-xs mt-0.5">Tổng bao</Text>
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text className="text-2xl mb-1">💰</Text>
            <Text className="text-base font-bold text-green-600">
              {formatMoney(transactionStats.income)}
            </Text>
            <Text className="text-gray-600 text-xs mt-0.5">Thu (đ)</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text className="text-2xl mb-1">💸</Text>
            <Text className="text-base font-bold text-red-600">
              {formatMoney(transactionStats.expense)}
            </Text>
            <Text className="text-gray-600 text-xs mt-0.5">Chi (đ)</Text>
          </View>
        </View>

        <View
          className="mx-4 mb-3 bg-white rounded-xl p-3"
          style={styles.shadow}
        >
          <Text className="text-2xl mb-1 text-center">📈</Text>
          <Text
            className="text-xl font-bold text-center"
            style={{
              color: transactionStats.profit >= 0 ? '#10b981' : '#ef4444',
            }}
          >
            {formatMoney(transactionStats.profit)} đ
          </Text>
          <Text className="text-gray-600 text-xs mt-0.5 text-center">
            Lợi nhuận
          </Text>
        </View>

        {/* Monthly Weight Chart */}
        <View
          className="mx-4 mb-3 bg-white rounded-xl p-3"
          style={styles.shadow}
        >
          <Text className="text-base font-bold text-gray-800 mb-2">
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
              width={SCREEN_WIDTH - 56}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: 12 }}
            />
          )}
        </View>

        {/* Monthly Bags Count Chart */}
        <View
          className="mx-4 mb-3 bg-white rounded-xl p-3"
          style={styles.shadow}
        >
          <Text className="text-base font-bold text-gray-800 mb-2">
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
              width={SCREEN_WIDTH - 56}
              height={180}
              chartConfig={chartConfig}
              style={{ borderRadius: 12 }}
            />
          )}
        </View>

        {/* Buyer Stats */}
        <View
          className="mx-4 mb-3 bg-white rounded-xl p-3"
          style={styles.shadow}
        >
          <Text className="text-base font-bold text-gray-800 mb-2">
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
                  className="flex-row items-center justify-between py-2 border-b border-gray-100"
                >
                  <View className="flex-row items-center flex-1">
                    <Text className="text-lg mr-2">
                      {index === 0
                        ? '🥇'
                        : index === 1
                        ? '🥈'
                        : index === 2
                        ? '🥉'
                        : '👤'}
                    </Text>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-800 text-sm">
                        {buyer.name}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {buyer.totals?.bags || 0} bao •{' '}
                        {formatWeight(buyer.totals?.weightKg || 0)} kg
                      </Text>
                    </View>
                  </View>
                  <Text className="font-bold text-emerald-600 text-sm">
                    {formatWeight(buyer.totals?.weightKg || 0)} kg
                  </Text>
                </View>
              ))
          ) : (
            <Text className="text-gray-400 text-center py-3 text-sm">
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
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});
