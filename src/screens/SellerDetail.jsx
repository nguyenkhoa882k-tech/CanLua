import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, ScrollView, StatusBar, Alert, StyleSheet, Dimensions } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { storage } from '../services/storage';
import { MoneyInput, WeightInput, DecimalInput } from '../components/MoneyInput';
import { formatNumber, numberToVietnamese, moneyToVietnamese, sum } from '../utils/numberUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SellerDetail() {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { buyerId, seller } = params || {};

  const [name, setName] = useState(seller?.name || '');
  const [unitPrice, setUnitPrice] = useState(seller?.unitPrice ? String(seller.unitPrice) : '');
  const [tarePerBag, setTarePerBag] = useState('0');
  const [impurity, setImpurity] = useState('0');
  const [deposit, setDeposit] = useState('0');
  const [paid, setPaid] = useState('0');
  const [confirmed, setConfirmed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [tables, setTables] = useState([
    { id: 1, rows: Array(6).fill({}).map(() => ({ a: '', b: '', c: '', d: '', e: '' })) },
  ]);
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  const [viewingTableIndex, setViewingTableIndex] = useState(0);
  const [maxDigits, setMaxDigits] = useState(3);
  const inputRefs = React.useRef({});
  const scrollViewRef = useRef(null);

  // Load saved data and settings
  useEffect(() => {
    (async () => {
      // Load settings FIRST
      const settings = await storage.get('app_settings');
      const newMaxDigits = (settings && settings.fourDigitInput) ? 4 : 3;
      setMaxDigits(newMaxDigits);
      // Settings loaded

      // Load weighing data
      const key = `weighing_${buyerId}_${seller?.id}`;
      const saved = await storage.get(key);
      if (saved) {
        setTables(saved.tables || tables);
        setTarePerBag(saved.tarePerBag || '0');
        setImpurity(saved.impurity || '0');
        setDeposit(saved.deposit || '0');
        setPaid(saved.paid || '0');
        setConfirmed(saved.confirmed || false);
        setLocked(saved.locked || false);
        
        // If confirmed (kết sổ), show first table. Otherwise, show last working table
        const tableIndex = saved.confirmed ? 0 : (saved.currentTableIndex || 0);
        setCurrentTableIndex(tableIndex);
        setViewingTableIndex(tableIndex);
        // Data loaded
        
        setUnitPrice(saved.unitPrice || (seller?.unitPrice ? String(seller.unitPrice) : ''));
      }
    })();
  }, [buyerId, seller?.id]);

  // Reload settings every time screen focuses
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const settings = await storage.get('app_settings');
        const newMaxDigits = (settings && settings.fourDigitInput) ? 4 : 3;
        setMaxDigits(newMaxDigits);
        // Settings reloaded
      })();
    }, [])
  );

  // Auto-save with useCallback to prevent recreation
  const saveData = useCallback(async () => {
    const key = `weighing_${buyerId}_${seller?.id}`;
    await storage.set(key, {
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
  }, [buyerId, seller?.id, tables, tarePerBag, impurity, deposit, paid, confirmed, locked, currentTableIndex, unitPrice]);

  // Auto-save with longer debounce to reduce lag
  useEffect(() => {
    const timer = setTimeout(saveData, 1500);
    return () => clearTimeout(timer);
  }, [tables, tarePerBag, impurity, deposit, paid, confirmed, locked, currentTableIndex, unitPrice]);

  // Memoize divisor to avoid recalculation
  const digitDivisor = useMemo(() => maxDigits === 4 ? 100 : 10, [maxDigits]);
  
  const totalsPerTable = useMemo(() => tables.map(t => ({
    a: sum(t.rows.map(r => Number(r.a || 0) / digitDivisor)),
    b: sum(t.rows.map(r => Number(r.b || 0) / digitDivisor)),
    c: sum(t.rows.map(r => Number(r.c || 0) / digitDivisor)),
    d: sum(t.rows.map(r => Number(r.d || 0) / digitDivisor)),
    e: sum(t.rows.map(r => Number(r.e || 0) / digitDivisor)),
  })), [tables, digitDivisor]);

  const totalKgAllTables = useMemo(() => sum(totalsPerTable.flatMap(t => [t.a, t.b, t.c, t.d, t.e])), [totalsPerTable]);
  
  // Calculate bags count = number of filled cells across all tables
  const bagsCount = useMemo(() => {
    let count = 0;
    tables.forEach(table => {
      table.rows.forEach(row => {
        if (row.a && Number(row.a) > 0) count++;
        if (row.b && Number(row.b) > 0) count++;
        if (row.c && Number(row.c) > 0) count++;
        if (row.d && Number(row.d) > 0) count++;
        if (row.e && Number(row.e) > 0) count++;
      });
    });
    return count;
  }, [tables]);
  
  // Net weight after subtracting tare and impurity
  const netAfterImpurity = useMemo(() => {
    const tareKg = Number(tarePerBag) || 0;
    const impurityKg = Number(impurity) || 0;
    return Math.max(totalKgAllTables - tareKg - impurityKg, 0);
  }, [totalKgAllTables, tarePerBag, impurity]);
  
  const amount = useMemo(() => (Number(unitPrice) || 0) * netAfterImpurity, [unitPrice, netAfterImpurity]);
  const remaining = useMemo(() => amount - (Number(deposit) || 0) - (Number(paid) || 0), [amount, deposit, paid]);

  const onChangeCell = (ti, ri, key, value) => {
    setTables(prev => prev.map((t, idx) => idx === ti ? { ...t, rows: t.rows.map((r, rIdx) => rIdx === ri ? { ...r, [key]: value } : r) } : t));
    
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
          setTables(prev => [...prev, { 
            id: prev.length + 1, 
            rows: Array(6).fill({}).map(() => ({ a: '', b: '', c: '', d: '', e: '' })) 
          }]);
        }
        setCurrentTableIndex(ti + 1);
        setViewingTableIndex(ti + 1);
        setTimeout(() => {
          scrollToTable(ti + 1);
          const nextRef = inputRefs.current[`${ti + 1}-0-a`];
          if (nextRef) nextRef.focus();
        }, 100);
      }
    }
  };

  const ensureNextTable = () => {
    const last = tables[tables.length - 1];
    const lastRow = last.rows[4];
    const lastColumnFilled = lastRow.e && lastRow.e.length > 0;
    
    if (lastColumnFilled && tables.length < 10) {
      setTables(prev => [...prev, { id: prev.length + 1, rows: Array(6).fill({}).map(() => ({ a: '', b: '', c: '', d: '', e: '' })) }]);
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
      const ref = inputRefs.current[`${current.ti}-${current.ri}-${current.col}`];
      if (ref) ref.focus();
    }
  };

  const scrollToTable = (index) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: index * (SCREEN_WIDTH - 40), animated: true });
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
        focusCurrentCell();
      }, 100);
    }
  };

  const onConfirm = async () => {
    if (confirmed) {
      Alert.alert('Đã kết sổ', 'Giao dịch này đã được xác nhận và kết sổ.');
    } else {
      Alert.alert(
        'Xác nhận kết sổ',
        `Tổng tiền: ${amount.toLocaleString()} đ\nCòn lại: ${remaining.toLocaleString()} đ\n\nBạn có chắc muốn kết sổ?`,
        [
          { text: 'Huỷ', style: 'cancel' },
          { 
            text: 'Xác nhận', 
            onPress: async () => {
              // Save current weighing as confirmed FIRST
              const key = `weighing_${buyerId}_${seller?.id}`;
              await storage.set(key, {
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
              const { updateBuyer } = require('../services/buyers');
              const sellersData = await storage.get(`sellers_${buyerId}`) || [];
              let totalWeight = 0;
              let totalWeighCount = 0;
              
              // Get settings for correct divisor
              const settings = await storage.get('app_settings');
              const digitDivisor = (settings && settings.fourDigitInput) ? 100 : 10;
              
              console.log('🔄 Calculating totals for buyer:', buyerId);
              console.log('🔄 Sellers:', sellersData.length);
              console.log('🔄 Divisor:', digitDivisor);
              
              // Calculate totals from all confirmed weighings
              for (const s of sellersData) {
                const weighKey = `weighing_${buyerId}_${s.id}`;
                const weighData = await storage.get(weighKey);
                
                if (weighData && weighData.confirmed) {
                  const tables = weighData.tables || [];
                  console.log(`🔄 Seller ${s.name} - Tables:`, tables.length);
                  
                  // Calculate weight from ALL rows in ALL tables
                  for (const table of tables) {
                    const tableWeight = table.rows.reduce((rowSum, row) => {
                      return rowSum + Object.values(row).reduce((cellSum, val) => cellSum + (Number(val) || 0) / digitDivisor, 0);
                    }, 0);
                    
                    console.log(`🔄 Table weight: ${tableWeight} kg`);
                    totalWeight += tableWeight;
                    totalWeighCount += 1; // Count each table as one weighing
                  }
                }
              }
              
              console.log('🔄 Total weight:', totalWeight, 'kg');
              console.log('🔄 Total weigh count:', totalWeighCount);
              
              // Update buyer with new totals
              await updateBuyer(buyerId, {
                totals: {
                  weightKg: Math.round(totalWeight * 10) / 10, // Round to 1 decimal
                  weighCount: totalWeighCount,
                },
              });
              
              Alert.alert('Thành công', `Đã kết sổ!\n\nTổng: ${Math.round(totalWeight * 10) / 10} kg\nLần cân: ${totalWeighCount}`);
            }
          },
        ]
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      
      {/* Header */}
      <View className="bg-emerald-500 pt-12 pb-4 px-5 rounded-b-3xl shadow-lg">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-white text-2xl">← Quay lại</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleLock}
            className={`px-4 py-2 rounded-xl ${locked ? 'bg-red-500' : 'bg-blue-500'}`}
          >
            <Text className="font-bold text-sm text-white">
              {locked ? '🔓 Mở khóa' : '🔒 Khóa'}
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center">
          <Text className="text-xl mr-2">👤</Text>
          <Text className="text-2xl font-bold text-white flex-1">{name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Summary Card */}
        <View className="mx-5 mt-4 bg-white rounded-3xl p-5 shadow-lg">
          <Text className="text-xl font-bold text-gray-800 mb-4">📊 Tổng kết</Text>
          
          <View style={styles.summaryRow}>
            <TouchableOpacity 
              className="flex-1 bg-emerald-50 rounded-2xl p-4"
              onPress={() => Alert.alert('Tổng kg', numberToVietnamese(totalKgAllTables))}
            >
              <Text className="text-3xl font-bold text-emerald-700">{formatNumber(totalKgAllTables)}</Text>
              <Text className="text-emerald-600 text-xs mt-1">Tổng kg (nhấn xem chữ)</Text>
            </TouchableOpacity>
            <View className="flex-1 bg-blue-50 rounded-2xl p-4">
              <Text className="text-3xl font-bold text-blue-700">{bagsCount}</Text>
              <Text className="text-blue-600 text-xs mt-1">Số bao</Text>
            </View>
          </View>
          <View className="bg-gray-50 rounded-2xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-600 text-sm">Trừ bao bì (kg)</Text>
              <Text className="text-red-600 font-bold text-base">-{(Number(tarePerBag) || 0).toFixed(1)} kg</Text>
            </View>
            <DecimalInput
              className="bg-white rounded-xl px-4 py-3 text-lg font-bold border border-gray-200"
              value={tarePerBag}
              onChangeText={setTarePerBag}
              editable={!locked}
              placeholder="Nhập kg bao bì (vd: 50 hoặc 50,5)"
            />
          </View>

          <View className="bg-gray-50 rounded-2xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-600 text-sm">Trừ tạp chất (kg)</Text>
              <Text className="text-red-600 font-bold text-base">-{(Number(impurity) || 0).toFixed(1)} kg</Text>
            </View>
            <DecimalInput
              className="bg-white rounded-xl px-4 py-3 text-lg font-bold border border-gray-200"
              value={impurity}
              onChangeText={setImpurity}
              editable={!locked}
              placeholder="Nhập kg tạp chất (vd: 10 hoặc 10,5)"
            />
          </View>

          <TouchableOpacity 
            className="bg-emerald-50 rounded-2xl p-4 mb-3 border-2 border-emerald-300"
            onPress={() => Alert.alert('Khối lượng thực', numberToVietnamese(netAfterImpurity))}
          >
            <Text className="text-emerald-700 font-bold text-lg">
              ✅ Khối lượng thực: {formatNumber(netAfterImpurity)} kg
            </Text>
            <Text className="text-emerald-600 text-xs mt-1">
              = {formatNumber(totalKgAllTables)} - {formatNumber(Number(tarePerBag) || 0)} (bao bì) - {formatNumber(Number(impurity) || 0)} (tạp chất)
            </Text>
            <Text className="text-emerald-500 text-xs mt-1 italic">Nhấn để xem số bằng chữ</Text>
          </TouchableOpacity>

          <View className="bg-gray-50 rounded-2xl p-4 mb-3">
            <Text className="text-gray-600 text-sm mb-2">Đơn giá (đ/kg)</Text>
            <MoneyInput
              className="bg-white rounded-xl px-4 py-3 text-lg font-bold border border-gray-200"
              value={unitPrice}
              onChangeText={setUnitPrice}
              editable={!locked}
            />
          </View>

          <TouchableOpacity 
            className="bg-amber-50 rounded-2xl p-4 mb-3"
            onPress={() => Alert.alert('Thành tiền', moneyToVietnamese(amount))}
          >
            <Text className="text-amber-700 font-bold text-xl">💰 {amount.toLocaleString('vi-VN')} đ</Text>
            <Text className="text-amber-600 text-xs mt-1">Thành tiền (nhấn xem chữ)</Text>
          </TouchableOpacity>

          <View className="bg-gray-50 rounded-2xl p-4 mb-3">
            <Text className="text-gray-600 text-sm mb-2">Tiền cọc (đ)</Text>
            <MoneyInput
              className="bg-white rounded-xl px-4 py-3 text-lg font-bold border border-gray-200"
              value={deposit}
              onChangeText={setDeposit}
              editable={!locked}
            />
          </View>

          <View className="bg-gray-50 rounded-2xl p-4 mb-3">
            <Text className="text-gray-600 text-sm mb-2">Tiền đã trả (đ)</Text>
            <MoneyInput
              className="bg-white rounded-xl px-4 py-3 text-lg font-bold border border-gray-200"
              value={paid}
              onChangeText={setPaid}
              editable={!locked}
            />
          </View>

          <View className={`rounded-2xl p-4 ${remaining >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
            <Text className={`font-bold text-xl ${remaining >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {remaining >= 0 ? '💵' : '⚠️'} {Math.abs(remaining).toLocaleString()} đ
            </Text>
            <Text className={`text-xs mt-1 ${remaining >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {remaining >= 0 ? 'Còn lại' : 'Thừa'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onConfirm}
            className={`mt-3 rounded-2xl py-4 items-center ${confirmed ? 'bg-gray-300' : 'bg-emerald-500'}`}
            disabled={confirmed}
          >
            <Text className={`font-bold text-base ${confirmed ? 'text-gray-500' : 'text-white'}`}>
              {confirmed ? '✅ Đã kết sổ' : '✅ Xác nhận và kết sổ'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Weight Tables - Horizontal Scroll */}
        <View className="mt-4">
          {/* Navigation Header */}
          <View className="flex-row items-center justify-between px-5 mb-3">
            <TouchableOpacity
              onPress={goToPrevTable}
              disabled={viewingTableIndex === 0}
              className={`px-4 py-2 rounded-xl ${viewingTableIndex === 0 ? 'bg-gray-200' : 'bg-blue-500'}`}
            >
              <Text className={`font-bold ${viewingTableIndex === 0 ? 'text-gray-400' : 'text-white'}`}>← Trước</Text>
            </TouchableOpacity>
            
            <View className="bg-emerald-500 px-6 py-2 rounded-xl">
              <Text className="text-white font-bold text-base">📋 Bảng {viewingTableIndex + 1}/{tables.length}</Text>
            </View>
            
            <TouchableOpacity
              onPress={goToNextTable}
              disabled={viewingTableIndex === tables.length - 1}
              className={`px-4 py-2 rounded-xl ${viewingTableIndex === tables.length - 1 ? 'bg-gray-200' : 'bg-blue-500'}`}
            >
              <Text className={`font-bold ${viewingTableIndex === tables.length - 1 ? 'text-gray-400' : 'text-white'}`}>Sau →</Text>
            </TouchableOpacity>
          </View>

          {/* Single Table View - Only render current viewing table */}
          <View style={{ paddingHorizontal: 20 }}>
            {(() => {
              const ti = viewingTableIndex;
              const table = tables[ti];
              if (!table) return null;
              
              return (
                <View key={table.id} style={{ width: SCREEN_WIDTH - 40 }} className="bg-white rounded-3xl p-5 shadow-lg">
                  {[0,1,2,3,4,5].map((ri) => (
                    <View key={ri} style={styles.tableRow}>
                      {['a','b','c','d','e'].map((key) => {
                        // Row 6 is total row (read-only)
                        if (ri === 5) {
                          const colTotal = totalsPerTable[ti]?.[key] || 0;
                          return (
                            <View key={key} className="flex-1 bg-emerald-100 rounded-xl px-1 py-3 border-2 border-emerald-400">
                              <Text className="text-center font-bold text-emerald-800">{colTotal.toFixed(1)}</Text>
                            </View>
                          );
                        }
                        
                        // Only allow editing current table and previous tables
                        const canEdit = !confirmed && locked && ti <= currentTableIndex;
                  
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
                      ref={(ref) => { inputRefs.current[`${ti}-${ri}-${key}`] = ref; }}
                      className="flex-1 bg-gray-50 rounded-xl px-2 py-3 text-center font-bold border border-gray-200"
                      style={!canEdit && locked ? { backgroundColor: '#f3f4f6', opacity: 0.5 } : {}}
                      placeholder="0"
                      value={tables[ti].rows[ri][key]}
                      onChangeText={(v) => onChangeCell(ti, ri, key, v)}
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

                  <View className="mt-3 bg-emerald-50 rounded-2xl p-3">
                    <Text className="text-emerald-800 font-bold text-base mt-1">
                      Tổng bảng: {sum([totalsPerTable[ti].a, totalsPerTable[ti].b, totalsPerTable[ti].c, totalsPerTable[ti].d, totalsPerTable[ti].e]).toFixed(1)} kg
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>

        <View className="mx-5 mt-4 mb-6 bg-emerald-500 rounded-3xl p-6 shadow-lg">
          <Text className="text-white text-center text-2xl font-bold">🌾 {totalKgAllTables.toFixed(1)} kg</Text>
          <Text className="text-emerald-100 text-center text-sm mt-1">Tổng kết {tables.length} bảng</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
});
