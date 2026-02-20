import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Dimensions,
} from 'react-native';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import {
  getSettings,
  setSettingValue,
  getSettingValue,
} from '../services/settings';
import { updateBuyer } from '../services/buyers';
import {
  MoneyInput,
  WeightInput,
  DecimalInput,
} from '../components/MoneyInput';
import {
  formatNumber,
  numberToVietnamese,
  moneyToVietnamese,
  sum,
} from '../utils/numberUtils';
import {
  safeNumber,
  safeDivide,
  calculateAmount,
} from '../utils/safeCalculations';
import logger from '../utils/logger';
import { useBluetoothStore } from '../stores/useBluetoothStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SellerDetail() {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { buyerId, seller } = params || {};
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { currentWeight, isConnected: bluetoothConnected } =
    useBluetoothStore();

  const [name] = useState(seller?.name || '');
  const [unitPrice, setUnitPrice] = useState(
    seller?.unitPrice ? String(seller.unitPrice) : '',
  );
  const [tarePerBag, setTarePerBag] = useState('0');
  const [impurity, setImpurity] = useState('0');
  const [deposit, setDeposit] = useState('0');
  const [paid, setPaid] = useState('0');
  const [confirmed, setConfirmed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [tables, setTables] = useState([
    {
      id: 1,
      rows: new Array(6)
        .fill({})
        .map(() => ({ a: '', b: '', c: '', d: '', e: '' })),
    },
  ]);
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  const [viewingTableIndex, setViewingTableIndex] = useState(0);
  const [maxDigits, setMaxDigits] = useState(3);
  const inputRefs = React.useRef({});
  const scrollViewRef = useRef(null);
  const saveTimerRef = useRef(null); // Use ref for timer to prevent multiple timers

  // Cleanup inputRefs when component unmounts
  useEffect(() => {
    return () => {
      inputRefs.current = {};
    };
  }, []);

  // Cleanup inputRefs when tables change (remove refs for deleted tables)
  useEffect(() => {
    const validKeys = new Set();
    tables.forEach((t, ti) => {
      t.rows.forEach((r, ri) => {
        ['a', 'b', 'c', 'd', 'e'].forEach(key => {
          validKeys.add(`${ti}-${ri}-${key}`);
        });
      });
    });

    Object.keys(inputRefs.current).forEach(key => {
      if (!validKeys.has(key)) {
        delete inputRefs.current[key];
      }
    });
  }, [tables]);

  // Load saved data and settings
  useEffect(() => {
    (async () => {
      // Load settings FIRST
      const settings = await getSettings();
      const newMaxDigits = settings && settings.fourDigitInput ? 4 : 3;
      setMaxDigits(newMaxDigits);
      // Settings loaded

      // Load weighing data (from AsyncStorage temporarily until migrated)
      const key = `weighing_${buyerId}_${seller?.id}`;
      const saved = await getSettingValue(key);
      if (saved) {
        setTables(saved.tables || tables);
        setTarePerBag(saved.tarePerBag || '0');
        setImpurity(saved.impurity || '0');
        setDeposit(saved.deposit || '0');
        setPaid(saved.paid || '0');
        setConfirmed(saved.confirmed || false);
        setLocked(saved.locked || false);

        // If confirmed (kết sổ), show first table. Otherwise, show last working table
        const tableIndex = saved.confirmed ? 0 : saved.currentTableIndex || 0;
        setCurrentTableIndex(tableIndex);
        setViewingTableIndex(tableIndex);
        // Data loaded

        setUnitPrice(
          saved.unitPrice ||
            (seller?.unitPrice ? String(seller.unitPrice) : ''),
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId, seller?.id]);

  // Reload settings every time screen focuses
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const settings = await getSettings();
        const newMaxDigits = settings && settings.fourDigitInput ? 4 : 3;
        setMaxDigits(newMaxDigits);
        // Settings reloaded
      })();
    }, []),
  );

  // Auto-save with useCallback to prevent recreation and use ref for timer
  const saveData = useCallback(async () => {
    const key = `weighing_${buyerId}_${seller?.id}`;
    await setSettingValue(key, {
      tables,
      tarePerBag,
      impurity,
      deposit,
      paid,
      confirmed,
      locked,
      currentTableIndex,
      unitPrice,
      updatedAt: new Date().toISOString(),
    });

    // Also update seller's unitPrice in sellers list if changed
    if (unitPrice && seller?.unitPrice !== Number(unitPrice)) {
      const sellersData = (await getSettingValue(`sellers_${buyerId}`)) || [];
      const updatedSellers = sellersData.map(s =>
        s.id === seller?.id ? { ...s, unitPrice: Number(unitPrice) } : s,
      );
      await setSettingValue(`sellers_${buyerId}`, updatedSellers);
    }
  }, [
    buyerId,
    seller?.id,
    seller?.unitPrice,
    tables,
    tarePerBag,
    impurity,
    deposit,
    paid,
    confirmed,
    locked,
    currentTableIndex,
    unitPrice,
  ]);

  // Auto-save with debounce using ref to prevent multiple timers
  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(saveData, 1500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [saveData]);

  // Memoize divisor to avoid recalculation
  const digitDivisor = useMemo(() => (maxDigits === 4 ? 100 : 10), [maxDigits]);

  const totalsPerTable = useMemo(
    () =>
      tables.map(t => ({
        a: sum(t.rows.map(r => safeDivide(safeNumber(r.a), digitDivisor))),
        b: sum(t.rows.map(r => safeDivide(safeNumber(r.b), digitDivisor))),
        c: sum(t.rows.map(r => safeDivide(safeNumber(r.c), digitDivisor))),
        d: sum(t.rows.map(r => safeDivide(safeNumber(r.d), digitDivisor))),
        e: sum(t.rows.map(r => safeDivide(safeNumber(r.e), digitDivisor))),
      })),
    [tables, digitDivisor],
  );

  const totalKgAllTables = useMemo(
    () => sum(totalsPerTable.flatMap(t => [t.a, t.b, t.c, t.d, t.e])),
    [totalsPerTable],
  );

  // Calculate bags count = number of filled cells across all tables
  const bagsCount = useMemo(() => {
    let count = 0;
    for (const table of tables) {
      for (const row of table.rows) {
        if (row.a && safeNumber(row.a) > 0) count++;
        if (row.b && safeNumber(row.b) > 0) count++;
        if (row.c && safeNumber(row.c) > 0) count++;
        if (row.d && safeNumber(row.d) > 0) count++;
        if (row.e && safeNumber(row.e) > 0) count++;
      }
    }
    return count;
  }, [tables]);

  // Net weight after subtracting tare and impurity
  const netAfterImpurity = useMemo(() => {
    const tareKg = safeNumber(tarePerBag);
    const impurityKg = safeNumber(impurity);
    return Math.max(totalKgAllTables - tareKg - impurityKg, 0);
  }, [totalKgAllTables, tarePerBag, impurity]);

  const amount = useMemo(
    () => calculateAmount(unitPrice, netAfterImpurity),
    [unitPrice, netAfterImpurity],
  );

  const remaining = useMemo(
    () => amount - safeNumber(deposit) - safeNumber(paid),
    [amount, deposit, paid],
  );

  const onChangeCell = (ti, ri, key, value) => {
    setTables(prev =>
      prev.map((t, idx) =>
        idx === ti
          ? {
              ...t,
              rows: t.rows.map((r, rIdx) =>
                rIdx === ri ? { ...r, [key]: value } : r,
              ),
            }
          : t,
      ),
    );

    // Auto-focus next cell when reaching maxDigits (3 or 4 based on settings)
    if (value.length === maxDigits) {
      const cols = ['a', 'b', 'c', 'd', 'e'];
      const colIndex = cols.indexOf(key);

      // Move down in same column
      if (ri < 4) {
        const nextRef = inputRefs.current[`${ti}-${ri + 1}-${key}`];
        if (nextRef) nextRef.focus();
      }
      // Move to next column, first row
      else if (colIndex < 4) {
        const nextCol = cols[colIndex + 1];
        const nextRef = inputRefs.current[`${ti}-0-${nextCol}`];
        if (nextRef) nextRef.focus();
      }
      // Column E row 5 filled - create new table and focus first cell
      else if (ri === 4 && key === 'e') {
        // This is the last cell (row 4, column E), create new table
        if (tables.length < 10) {
          setTables(prev => [
            ...prev,
            {
              id: prev.length + 1,
              rows: new Array(6)
                .fill({})
                .map(() => ({ a: '', b: '', c: '', d: '', e: '' })),
            },
          ]);
        }
        setCurrentTableIndex(ti + 1);
        setViewingTableIndex(ti + 1);

        // Wait longer for render and scroll, then focus
        setTimeout(() => {
          scrollToTable(ti + 1);
        }, 50);

        setTimeout(() => {
          const nextRef = inputRefs.current[`${ti + 1}-0-a`];
          if (nextRef) {
            nextRef.focus();
          }
        }, 300);
      }
    }
  };

  const findCurrentCell = () => {
    const table = tables[currentTableIndex];
    if (!table) return null;

    const cols = ['a', 'b', 'c', 'd', 'e'];
    for (let col of cols) {
      for (let ri = 0; ri < 5; ri++) {
        if (!table.rows[ri][col]) {
          return { ti: currentTableIndex, ri, col };
        }
      }
    }
    return null;
  };

  const focusCurrentCell = () => {
    const current = findCurrentCell();
    if (current) {
      const ref =
        inputRefs.current[`${current.ti}-${current.ri}-${current.col}`];
      if (ref) ref.focus();
    }
  };

  const scrollToTable = index => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * (SCREEN_WIDTH - 40),
        animated: true,
      });
    }
  };

  const goToPrevTable = () => {
    if (viewingTableIndex > 0) {
      const newIndex = viewingTableIndex - 1;
      setViewingTableIndex(newIndex);
      scrollToTable(newIndex);
    }
  };

  const goToNextTable = () => {
    if (viewingTableIndex < tables.length - 1) {
      const newIndex = viewingTableIndex + 1;
      setViewingTableIndex(newIndex);
      scrollToTable(newIndex);
    }
  };

  const toggleLock = () => {
    const newLocked = !locked;
    setLocked(newLocked);

    // Auto-focus to first empty cell in current table when locking
    if (newLocked) {
      setViewingTableIndex(currentTableIndex);
      setTimeout(() => {
        scrollToTable(currentTableIndex);
      }, 50);
      setTimeout(() => {
        focusCurrentCell();
      }, 300);
    }
  };

  const onConfirm = async () => {
    if (confirmed) {
      showAlert({
        title: 'Đã kết sổ',
        message: 'Giao dịch này đã được xác nhận và kết sổ.',
        buttons: [{ text: 'OK', onPress: hideAlert }],
      });
    } else {
      showAlert({
        title: 'Xác nhận kết sổ',
        message: `Tổng tiền: ${amount.toLocaleString()} đ\nCòn lại: ${remaining.toLocaleString()} đ\n\nBạn có chắc muốn kết sổ?`,
        buttons: [
          { text: 'Huỷ', onPress: hideAlert },
          {
            text: 'Xác nhận',
            onPress: async () => {
              hideAlert();
              // Save current weighing as confirmed FIRST
              const key = `weighing_${buyerId}_${seller?.id}`;
              await setSettingValue(key, {
                tables,
                tarePerBag,
                impurity,
                deposit,
                paid,
                confirmed: true, // Set to true
                locked,
                unitPrice,
                currentTableIndex,
                updatedAt: new Date().toISOString(),
              });

              setConfirmed(true);

              // Now calculate totals including this weighing
              const sellersData =
                (await getSettingValue(`sellers_${buyerId}`)) || [];
              let totalWeight = 0;
              let totalWeighCount = 0;

              // Get settings for correct divisor
              const settings = await getSettings();
              const divisor = settings && settings.fourDigitInput ? 100 : 10;

              logger.log('🔄 Calculating totals for buyer:', buyerId);
              logger.log('🔄 Sellers:', sellersData.length);
              logger.log('🔄 Divisor:', divisor);

              // Calculate totals from all confirmed weighings
              for (const s of sellersData) {
                const weighKey = `weighing_${buyerId}_${s.id}`;
                const weighData = await getSettingValue(weighKey);

                if (weighData && weighData.confirmed) {
                  const tablesToCalc = weighData.tables || [];
                  logger.log(
                    `🔄 Seller ${s.name} - Tables:`,
                    tablesToCalc.length,
                  );

                  // Calculate weight from ALL rows in ALL tables
                  for (const table of tablesToCalc) {
                    const tableWeight = table.rows.reduce((rowSum, row) => {
                      return (
                        rowSum +
                        Object.values(row).reduce(
                          (cellSum, val) =>
                            cellSum + safeDivide(safeNumber(val), divisor),
                          0,
                        )
                      );
                    }, 0);

                    logger.log(`🔄 Table weight: ${tableWeight} kg`);
                    totalWeight += tableWeight;
                    totalWeighCount += 1; // Count each table as one weighing
                  }
                }
              }

              logger.log('🔄 Total weight:', totalWeight, 'kg');
              logger.log('🔄 Total weigh count:', totalWeighCount);

              // Update buyer with new totals
              await updateBuyer(buyerId, {
                totals: {
                  weightKg: Math.round(totalWeight * 10) / 10, // Round to 1 decimal
                  weighCount: totalWeighCount,
                },
              });

              showAlert({
                title: 'Thành công',
                message: `Đã kết sổ!\n\nTổng: ${
                  Math.round(totalWeight * 10) / 10
                } kg\nLần cân: ${totalWeighCount}`,
                buttons: [{ text: 'OK', onPress: hideAlert }],
              });
            },
          },
        ],
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />

      {/* Header */}
      <View className="bg-emerald-500 pt-10 pb-3 px-4 rounded-b-2xl shadow-lg">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-white text-xl">← Quay lại</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleLock}
            className={`px-3 py-1.5 rounded-lg ${
              locked ? 'bg-red-500' : 'bg-blue-500'
            }`}
          >
            <Text className="font-bold text-xs text-white">
              {locked ? '🔓 Mở' : '🔒 Khóa'}
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center">
          <Text className="text-lg mr-2">👤</Text>
          <Text className="text-xl font-bold text-white flex-1">{name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary Card */}
        <View className="mx-4 mt-3 bg-white rounded-2xl p-3 shadow-lg">
          <Text className="text-lg font-bold text-gray-800 mb-2">
            📊 Tổng kết
          </Text>

          <View style={styles.summaryRow}>
            <TouchableOpacity
              className="flex-1 bg-emerald-50 rounded-xl p-3"
              onPress={() =>
                showAlert({
                  title: 'Tổng kg',
                  message: numberToVietnamese(totalKgAllTables),
                  buttons: [{ text: 'OK', onPress: hideAlert }],
                })
              }
            >
              <Text className="text-2xl font-bold text-emerald-700">
                {formatNumber(totalKgAllTables)}
              </Text>
              <Text className="text-emerald-600 text-xs mt-0.5">Tổng kg</Text>
            </TouchableOpacity>
            <View className="flex-1 bg-blue-50 rounded-xl p-3">
              <Text className="text-2xl font-bold text-blue-700">
                {bagsCount}
              </Text>
              <Text className="text-blue-600 text-xs mt-0.5">Số bao</Text>
            </View>
          </View>

          <View className="bg-gray-50 rounded-xl p-2.5 mb-2">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-gray-600 text-xs">Trừ bao bì (kg)</Text>
              <Text className="text-red-600 font-bold text-sm">
                -{(Number(tarePerBag) || 0).toFixed(1)} kg
              </Text>
            </View>
            <DecimalInput
              className="bg-white rounded-lg px-3 py-2 text-base font-bold border border-gray-200"
              value={tarePerBag}
              onChangeText={setTarePerBag}
              editable={!locked}
              placeholder="0"
            />
          </View>

          <View className="bg-gray-50 rounded-xl p-2.5 mb-2">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-gray-600 text-xs">Trừ tạp chất (kg)</Text>
              <Text className="text-red-600 font-bold text-sm">
                -{(Number(impurity) || 0).toFixed(1)} kg
              </Text>
            </View>
            <DecimalInput
              className="bg-white rounded-lg px-3 py-2 text-base font-bold border border-gray-200"
              value={impurity}
              onChangeText={setImpurity}
              editable={!locked}
              placeholder="0"
            />
          </View>

          <TouchableOpacity
            className="bg-emerald-50 rounded-xl p-2.5 mb-2 border border-emerald-300"
            onPress={() =>
              showAlert({
                title: 'Khối lượng thực',
                message: numberToVietnamese(netAfterImpurity),
                buttons: [{ text: 'OK', onPress: hideAlert }],
              })
            }
          >
            <Text className="text-emerald-700 font-bold text-base">
              ✅ Thực: {formatNumber(netAfterImpurity)} kg
            </Text>
            <Text className="text-emerald-600 text-xs mt-0.5">
              Nhấn xem chữ
            </Text>
          </TouchableOpacity>

          <View className="bg-gray-50 rounded-xl p-2.5 mb-2">
            <Text className="text-gray-600 text-xs mb-1.5">Đơn giá (đ/kg)</Text>
            <MoneyInput
              className="bg-white rounded-lg px-3 py-2 text-base font-bold border border-gray-200"
              value={unitPrice}
              onChangeText={setUnitPrice}
              editable={!locked}
              placeholder="0"
            />
          </View>

          <TouchableOpacity
            className="bg-amber-50 rounded-xl p-2.5 mb-2"
            onPress={() =>
              showAlert({
                title: 'Thành tiền',
                message: moneyToVietnamese(amount),
                buttons: [{ text: 'OK', onPress: hideAlert }],
              })
            }
          >
            <Text className="text-amber-700 font-bold text-lg">
              💰 {amount.toLocaleString('vi-VN')} đ
            </Text>
            <Text className="text-amber-600 text-xs mt-0.5">Nhấn xem chữ</Text>
          </TouchableOpacity>

          <View className="bg-gray-50 rounded-xl p-2.5 mb-2">
            <Text className="text-gray-600 text-xs mb-1.5">Tiền cọc (đ)</Text>
            <MoneyInput
              className="bg-white rounded-lg px-3 py-2 text-base font-bold border border-gray-200"
              value={deposit}
              onChangeText={setDeposit}
              editable={!locked}
              placeholder="0"
            />
          </View>

          <View className="bg-gray-50 rounded-xl p-2.5 mb-2">
            <Text className="text-gray-600 text-xs mb-1.5">
              Tiền đã trả (đ)
            </Text>
            <MoneyInput
              className="bg-white rounded-lg px-3 py-2 text-base font-bold border border-gray-200"
              value={paid}
              onChangeText={setPaid}
              editable={!locked}
              placeholder="0"
            />
          </View>

          <View
            className={`rounded-xl p-2.5 mb-2 ${
              remaining >= 0 ? 'bg-blue-50' : 'bg-red-50'
            }`}
          >
            <Text
              className={`font-bold text-lg ${
                remaining >= 0 ? 'text-blue-700' : 'text-red-700'
              }`}
            >
              {remaining >= 0 ? '💵' : '⚠️'}{' '}
              {Math.abs(remaining).toLocaleString()} đ
            </Text>
            <Text
              className={`text-xs mt-0.5 ${
                remaining >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}
            >
              {remaining >= 0 ? 'Còn lại' : 'Thừa'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onConfirm}
            className={`rounded-xl py-3 items-center ${
              confirmed ? 'bg-gray-300' : 'bg-emerald-500'
            }`}
            disabled={confirmed}
          >
            <Text
              className={`font-bold text-sm ${
                confirmed ? 'text-gray-500' : 'text-white'
              }`}
            >
              {confirmed ? '✅ Đã kết sổ' : '✅ Xác nhận và kết sổ'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Weight Tables - Horizontal Scroll */}
        <View className="mt-3">
          {/* Navigation Header */}
          <View className="flex-row items-center justify-between px-4 mb-2">
            <TouchableOpacity
              onPress={goToPrevTable}
              disabled={viewingTableIndex === 0}
              className={`px-3 py-1.5 rounded-lg ${
                viewingTableIndex === 0 ? 'bg-gray-200' : 'bg-blue-500'
              }`}
            >
              <Text
                className={`font-bold text-xs ${
                  viewingTableIndex === 0 ? 'text-gray-400' : 'text-white'
                }`}
              >
                ← Trước
              </Text>
            </TouchableOpacity>

            <View className="bg-emerald-500 px-4 py-1.5 rounded-lg">
              <Text className="text-white font-bold text-sm">
                📋 Bảng {viewingTableIndex + 1}/{tables.length}
              </Text>
            </View>

            <TouchableOpacity
              onPress={goToNextTable}
              disabled={viewingTableIndex === tables.length - 1}
              className={`px-3 py-1.5 rounded-lg ${
                viewingTableIndex === tables.length - 1
                  ? 'bg-gray-200'
                  : 'bg-blue-500'
              }`}
            >
              <Text
                className={`font-bold text-xs ${
                  viewingTableIndex === tables.length - 1
                    ? 'text-gray-400'
                    : 'text-white'
                }`}
              >
                Sau →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Single Table View - Only render current viewing table */}
          <View style={styles.tableContainer}>
            {(() => {
              const ti = viewingTableIndex;
              const table = tables[ti];
              if (!table) return null;

              return (
                <View
                  key={table.id}
                  style={{ width: SCREEN_WIDTH - 32 }}
                  className="bg-white rounded-2xl p-3 shadow-lg"
                >
                  {[0, 1, 2, 3, 4, 5].map(ri => (
                    <View key={ri} style={styles.tableRow}>
                      {['a', 'b', 'c', 'd', 'e'].map(key => {
                        // Row 6 is total row (read-only)
                        if (ri === 5) {
                          const colTotal = totalsPerTable[ti]?.[key] || 0;
                          return (
                            <View
                              key={key}
                              className="flex-1 bg-emerald-100 rounded-lg px-1 py-2 border border-emerald-400"
                            >
                              <Text className="text-center font-bold text-sm text-emerald-800">
                                {colTotal.toFixed(1)}
                              </Text>
                            </View>
                          );
                        }

                        // Only allow editing current table and previous tables
                        const canEdit =
                          !confirmed && locked && ti <= currentTableIndex;

                        // Check if this cell is in the future (after current cell)
                        const isFuture = () => {
                          if (ti > currentTableIndex) return true;
                          if (ti < currentTableIndex) return false;

                          const current = findCurrentCell();
                          if (!current) return false;

                          const cols = ['a', 'b', 'c', 'd', 'e'];
                          const currentColIndex = cols.indexOf(current.col);
                          const thisColIndex = cols.indexOf(key);

                          if (thisColIndex > currentColIndex) return true;
                          if (thisColIndex < currentColIndex) return false;
                          return ri > current.ri;
                        };

                        return (
                          <WeightInput
                            key={key}
                            ref={ref => {
                              inputRefs.current[`${ti}-${ri}-${key}`] = ref;
                            }}
                            className="flex-1 bg-gray-50 rounded-lg px-1 py-2 text-center text-sm font-bold border border-gray-200"
                            style={
                              !canEdit && locked
                                ? styles.disabledCell
                                : undefined
                            }
                            placeholder="0"
                            value={tables[ti].rows[ri][key]}
                            onChangeText={v => onChangeCell(ti, ri, key, v)}
                            onFocus={() => {
                              // If clicking future cell, jump back to current
                              if (locked && isFuture()) {
                                setTimeout(focusCurrentCell, 0);
                              }
                            }}
                            selectTextOnFocus={true}
                            editable={canEdit}
                            maxDigits={maxDigits}
                          />
                        );
                      })}
                    </View>
                  ))}

                  <View className="mt-2 bg-emerald-50 rounded-xl p-2">
                    <Text className="text-emerald-800 font-bold text-sm">
                      Tổng bảng:{' '}
                      {sum([
                        totalsPerTable[ti].a,
                        totalsPerTable[ti].b,
                        totalsPerTable[ti].c,
                        totalsPerTable[ti].d,
                        totalsPerTable[ti].e,
                      ]).toFixed(1)}{' '}
                      kg
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>

        {/* Bluetooth Weight Display - Moved below tables */}
        {bluetoothConnected && (
          <View className="mx-4 mt-3 bg-blue-50 rounded-2xl p-3 shadow-lg border border-blue-300">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Text className="text-xl mr-2">⚖️</Text>
                <Text className="text-base font-bold text-blue-800">
                  Cân Bluetooth
                </Text>
              </View>
              <View className="bg-green-500 px-2 py-0.5 rounded-full">
                <Text className="text-white text-xs font-bold">📡 Kết nối</Text>
              </View>
            </View>

            <View className="bg-white rounded-xl p-3 mb-2">
              <Text className="text-gray-600 text-xs mb-1">
                Khối lượng đo được
              </Text>
              <Text className="text-3xl font-bold text-blue-700 text-center">
                {currentWeight ? `${currentWeight.toFixed(1)} kg` : '-- kg'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (!currentWeight || currentWeight <= 0) {
                  showAlert({
                    title: 'Chưa có dữ liệu',
                    message: 'Vui lòng đợi cân đo khối lượng',
                    buttons: [{ text: 'OK', onPress: hideAlert }],
                  });
                  return;
                }

                if (locked) {
                  // Find current cell and add weight
                  const current = findCurrentCell();
                  if (current) {
                    // Convert kg to input format (multiply by divisor)
                    const weightValue = Math.round(
                      currentWeight * digitDivisor,
                    );
                    onChangeCell(
                      current.ti,
                      current.ri,
                      current.col,
                      String(weightValue),
                    );

                    showAlert({
                      title: 'Đã thêm',
                      message: `Đã thêm ${currentWeight.toFixed(
                        1,
                      )} kg vào bảng`,
                      buttons: [{ text: 'OK', onPress: hideAlert }],
                    });
                  } else {
                    showAlert({
                      title: 'Bảng đã đầy',
                      message: 'Không còn ô trống để thêm khối lượng',
                      buttons: [{ text: 'OK', onPress: hideAlert }],
                    });
                  }
                } else {
                  showAlert({
                    title: 'Chưa khóa bảng',
                    message:
                      'Vui lòng khóa bảng trước khi thêm khối lượng từ cân',
                    buttons: [{ text: 'OK', onPress: hideAlert }],
                  });
                }
              }}
              className="bg-blue-500 rounded-xl py-2.5 items-center"
              disabled={!currentWeight || currentWeight <= 0}
            >
              <Text className="font-bold text-sm text-white">
                ✅ Xác nhận và thêm vào bảng
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="mx-4 mt-3 mb-4 bg-emerald-500 rounded-2xl p-4 shadow-lg">
          <Text className="text-white text-center text-xl font-bold">
            🌾 {totalKgAllTables.toFixed(1)} kg
          </Text>
          <Text className="text-emerald-100 text-center text-xs mt-0.5">
            Tổng kết {tables.length} bảng
          </Text>
        </View>
      </ScrollView>
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
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  tableContainer: {
    paddingHorizontal: 16,
  },
  disabledCell: {
    backgroundColor: '#f3f4f6',
    opacity: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
});
