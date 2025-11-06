import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, ScrollView, StatusBar, Alert, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { storage } from '../services/storage';
import { MoneyInput, WeightInput } from '../components/MoneyInput';

function sum(arr) { 
  return arr.reduce((a, b) => a + (Number(b) || 0), 0); 
}

export default function SellerDetail() {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { buyerId, seller } = params || {};

  const [name, setName] = useState(seller?.name || '');
  const [unitPrice, setUnitPrice] = useState(seller?.unitPrice ? String(seller.unitPrice) : '');
  const [tarePerBag, setTarePerBag] = useState('8');
  const [impurity, setImpurity] = useState('0');
  const [deposit, setDeposit] = useState('0');
  const [paid, setPaid] = useState('0');
  const [confirmed, setConfirmed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [tables, setTables] = useState([
    { id: 1, rows: Array(6).fill({}).map(() => ({ a: '', b: '', c: '', d: '', e: '' })) },
  ]);
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  const inputRefs = React.useRef({});

  // Load saved data
  useEffect(() => {
    (async () => {
      const key = `weighing_${buyerId}_${seller?.id}`;
      const saved = await storage.get(key);
      if (saved) {
        setTables(saved.tables || tables);
        setTarePerBag(saved.tarePerBag || '8');
        setImpurity(saved.impurity || '0');
        setDeposit(saved.deposit || '0');
        setPaid(saved.paid || '0');
        setConfirmed(saved.confirmed || false);
        setLocked(saved.locked || false);
        setCurrentTableIndex(saved.currentTableIndex || 0);
        setUnitPrice(saved.unitPrice || (seller?.unitPrice ? String(seller.unitPrice) : ''));
      }
    })();
  }, [buyerId, seller?.id]);

  // Auto-save
  const saveData = async () => {
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
  };

  useEffect(() => {
    const timer = setTimeout(saveData, 500);
    return () => clearTimeout(timer);
  }, [tables, tarePerBag, impurity, deposit, paid, confirmed, locked, currentTableIndex, unitPrice]);

  const totalsPerTable = useMemo(() => tables.map(t => ({
    a: sum(t.rows.map(r => Number(r.a || 0) / 10)),
    b: sum(t.rows.map(r => Number(r.b || 0) / 10)),
    c: sum(t.rows.map(r => Number(r.c || 0) / 10)),
    d: sum(t.rows.map(r => Number(r.d || 0) / 10)),
    e: sum(t.rows.map(r => Number(r.e || 0) / 10)),
  })), [tables]);

  const totalKgAllTables = useMemo(() => sum(totalsPerTable.flatMap(t => [t.a, t.b, t.c, t.d, t.e])), [totalsPerTable]);
  const bagsCount = useMemo(() => {
    const tare = Number(tarePerBag) || 8;
    return Math.round(totalKgAllTables / tare);
  }, [totalKgAllTables, tarePerBag]);
  const netAfterImpurity = useMemo(() => Math.max(totalKgAllTables - (Number(impurity) || 0), 0), [totalKgAllTables, impurity]);
  const amount = useMemo(() => (Number(unitPrice) || 0) * netAfterImpurity, [unitPrice, netAfterImpurity]);
  const remaining = useMemo(() => amount - (Number(deposit) || 0) - (Number(paid) || 0), [amount, deposit, paid]);

  const onChangeCell = (ti, ri, key, value) => {
    setTables(prev => prev.map((t, idx) => idx === ti ? { ...t, rows: t.rows.map((r, rIdx) => rIdx === ri ? { ...r, [key]: value } : r) } : t));
    
    // Auto-focus next cell (column-wise: top to bottom, then next column)
    if (value.length === 3) {
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
      else {
        ensureNextTable();
        setCurrentTableIndex(ti + 1);
        setTimeout(() => {
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

  const toggleLock = () => {
    const newLocked = !locked;
    setLocked(newLocked);
    
    // Auto-focus to first empty cell in current table when locking
    if (newLocked) {
      setTimeout(focusCurrentCell, 100);
    }
  };

  const onConfirm = () => {
    if (confirmed) {
      Alert.alert('Đã kết sổ', 'Giao dịch này đã được xác nhận và kết sổ.');
    } else {
      Alert.alert(
        'Xác nhận kết sổ',
        `Tổng tiền: ${amount.toLocaleString()} đ\nCòn lại: ${remaining.toLocaleString()} đ\n\nBạn có chắc muốn kết sổ?`,
        [
          { text: 'Huỷ', style: 'cancel' },
          { text: 'Xác nhận', onPress: () => setConfirmed(true) },
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
            <View className="flex-1 bg-emerald-50 rounded-2xl p-4">
              <Text className="text-3xl font-bold text-emerald-700">{totalKgAllTables.toFixed(1)}</Text>
              <Text className="text-emerald-600 text-xs mt-1">Tổng kg</Text>
            </View>
            <View className="flex-1 bg-blue-50 rounded-2xl p-4">
              <Text className="text-3xl font-bold text-blue-700">{bagsCount}</Text>
              <Text className="text-blue-600 text-xs mt-1">Số bao</Text>
            </View>
          </View>

          <View className="bg-gray-50 rounded-2xl p-4 mb-3">
            <Text className="text-gray-600 text-sm mb-2">Bao bì (kg/bao)</Text>
            <MoneyInput
              className="bg-white rounded-xl px-4 py-3 text-lg font-bold border border-gray-200"
              value={tarePerBag}
              onChangeText={setTarePerBag}
              editable={!locked}
            />
          </View>

          <View className="bg-gray-50 rounded-2xl p-4 mb-3">
            <Text className="text-gray-600 text-sm mb-2">Trừ tạp chất (kg)</Text>
            <MoneyInput
              className="bg-white rounded-xl px-4 py-3 text-lg font-bold border border-gray-200"
              value={impurity}
              onChangeText={setImpurity}
              editable={!locked}
            />
          </View>

          <View className="bg-emerald-50 rounded-2xl p-4 mb-3">
            <Text className="text-emerald-700 font-bold text-base">Khối lượng thực: {netAfterImpurity.toFixed(1)} kg</Text>
          </View>

          <View className="bg-gray-50 rounded-2xl p-4 mb-3">
            <Text className="text-gray-600 text-sm mb-2">Đơn giá (đ/kg)</Text>
            <MoneyInput
              className="bg-white rounded-xl px-4 py-3 text-lg font-bold border border-gray-200"
              value={unitPrice}
              onChangeText={setUnitPrice}
              editable={!locked}
            />
          </View>

          <View className="bg-amber-50 rounded-2xl p-4 mb-3">
            <Text className="text-amber-700 font-bold text-xl">💰 {amount.toLocaleString()} đ</Text>
            <Text className="text-amber-600 text-xs mt-1">Thành tiền</Text>
          </View>

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

        {/* Weight Tables */}
        {tables.map((table, ti) => (
          <View key={table.id} className="mx-5 mt-4 bg-white rounded-3xl p-5 shadow-lg">
            <Text className="text-lg font-bold text-gray-800 mb-3">📋 Bảng cân {ti + 1}</Text>
            
            {[0,1,2,3,4,5].map((ri) => (
              <View key={ri} style={styles.tableRow}>
                {['a','b','c','d','e'].map((key) => {
                  // Row 6 is total row (read-only)
                  if (ri === 5) {
                    const colTotal = totalsPerTable[ti][key];
                    return (
                      <View key={key} className="flex-1 bg-emerald-100 rounded-xl px-2 py-3 border-2 border-emerald-400">
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
                    />
                  );
                })}
              </View>
            ))}

            <View className="mt-3 bg-emerald-50 rounded-2xl p-3">
              <Text className="text-emerald-700 text-sm">
                Tổng cột: A={totalsPerTable[ti].a.toFixed(1)} | B={totalsPerTable[ti].b.toFixed(1)} | C={totalsPerTable[ti].c.toFixed(1)} | D={totalsPerTable[ti].d.toFixed(1)} | E={totalsPerTable[ti].e.toFixed(1)}
              </Text>
              <Text className="text-emerald-800 font-bold text-base mt-1">
                Tổng bảng: {sum([totalsPerTable[ti].a, totalsPerTable[ti].b, totalsPerTable[ti].c, totalsPerTable[ti].d, totalsPerTable[ti].e]).toFixed(1)} kg
              </Text>
            </View>
          </View>
        ))}

        <View className="mx-5 mt-4 mb-6 bg-emerald-500 rounded-3xl p-6 shadow-lg">
          <Text className="text-white text-center text-2xl font-bold">🌾 {totalKgAllTables.toFixed(1)} kg</Text>
          <Text className="text-emerald-100 text-center text-sm mt-1">Tổng kết tất cả bảng</Text>
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
