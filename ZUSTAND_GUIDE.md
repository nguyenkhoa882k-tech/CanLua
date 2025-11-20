# Zustand State Management

## Tổng quan

Dự án sử dụng Zustand để quản lý state toàn cục. Zustand là một thư viện state management nhẹ, đơn giản và hiệu quả.

## Cấu trúc

### Stores (`src/stores/`)

1. **useBuyerStore** - Quản lý buyers
2. **useTransactionStore** - Quản lý transactions
3. **useSettingsStore** - Quản lý app settings
4. **useUIStore** - Quản lý UI state (modals, filters, etc.)
5. **useSellerStore** - Quản lý sellers
6. **useWeighingStore** - Quản lý weighing data

### Custom Hooks (`src/hooks/`)

Custom hooks để dễ dàng sử dụng stores với auto-fetching và lifecycle management.

## Cách sử dụng

### 1. Buyers

```javascript
import { useBuyers, useBuyer } from '../hooks';

// Lấy tất cả buyers (tự động fetch khi mount)
function BuyerList() {
  const {
    buyers,
    loading,
    error,
    refresh,
    addBuyer,
    updateBuyer,
    removeBuyer,
  } = useBuyers();

  const handleAdd = async () => {
    await addBuyer({ name: 'Nguyễn Văn A', phone: '0123456789' });
  };

  return (
    <View>
      {loading && <Text>Loading...</Text>}
      {buyers.map(buyer => (
        <Text key={buyer.id}>{buyer.name}</Text>
      ))}
    </View>
  );
}

// Lấy một buyer cụ thể
function BuyerDetail({ buyerId }) {
  const { buyer, loading, error, refresh } = useBuyer(buyerId);

  return <View>{buyer && <Text>{buyer.name}</Text>}</View>;
}
```

### 2. Transactions

```javascript
import { useTransactions, useYearlyStats } from '../hooks';

// Lấy tất cả transactions
function TransactionList() {
  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    removeTransaction,
  } = useTransactions();

  const handleAdd = async () => {
    await addTransaction({
      type: 'income',
      category: 'Bán lúa',
      amount: 5000000,
      date: new Date().toISOString(),
      note: 'Ghi chú',
    });
  };

  return (
    <View>
      {transactions.map(tx => (
        <Text key={tx.id}>{tx.category}</Text>
      ))}
    </View>
  );
}

// Thống kê theo năm
function Statistics() {
  const { stats, loading, selectedYear, setYear } = useYearlyStats(2024);

  return (
    <View>
      <Text>Thu: {stats?.income}</Text>
      <Text>Chi: {stats?.expense}</Text>
      <Text>Lãi: {stats?.profit}</Text>
    </View>
  );
}
```

### 3. Settings

```javascript
import { useSettings, useDigitDivisor } from '../hooks';

function SettingsScreen() {
  const {
    settings,
    autoBackup,
    fourDigitInput,
    toggleAutoBackup,
    toggleFourDigitInput,
    updateSetting,
  } = useSettings();

  return (
    <View>
      <Switch value={autoBackup} onValueChange={toggleAutoBackup} />
      <Switch value={fourDigitInput} onValueChange={toggleFourDigitInput} />
    </View>
  );
}

// Sử dụng digit divisor
function SomeComponent() {
  const { divisor, fourDigitInput } = useDigitDivisor();

  // divisor sẽ là 100 nếu fourDigitInput = true, ngược lại là 10
  const weight = value / divisor;
}
```

### 4. Sellers

```javascript
import { useSellers } from '../hooks';

function SellerList({ buyerId }) {
  const { sellers, loading, addSeller, updateSeller, removeSeller } =
    useSellers(buyerId);

  const handleAdd = async () => {
    await addSeller({
      name: 'Seller 1',
      unitPrice: 7000,
    });
  };

  return (
    <View>
      {sellers.map(seller => (
        <Text key={seller.id}>{seller.name}</Text>
      ))}
    </View>
  );
}
```

### 5. Weighing Data

```javascript
import { useWeighing } from '../hooks';

function WeighingScreen({ buyerId, sellerId }) {
  const {
    weighing,
    loading,
    isConfirmed,
    save,
    update,
    confirm
  } = useWeighing(buyerId, sellerId);

  const handleSave = async () => {
    await save({
      tables: [...],
      tarePerBag: '0',
      impurity: '0',
      confirmed: false
    });
  };

  const handleConfirm = async () => {
    await confirm();
  };

  return (
    <View>
      {weighing && <Text>Tables: {weighing.tables?.length}</Text>}
      {isConfirmed && <Text>Đã kết sổ</Text>}
    </View>
  );
}
```

### 6. UI State

```javascript
import { useUIStore } from '../stores';

function MyComponent() {
  const {
    modalVisible,
    openModal,
    closeModal,
    filterType,
    setFilterType,
    searchQuery,
    setSearchQuery,
  } = useUIStore();

  return (
    <View>
      <Button onPress={openModal} title="Open Modal" />
      <Modal visible={modalVisible} onRequestClose={closeModal}>
        <Text>Modal Content</Text>
      </Modal>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search..."
      />
    </View>
  );
}
```

## Sử dụng trực tiếp Store (không dùng hook)

```javascript
import { useBuyerStore } from '../stores';

function MyComponent() {
  // Lấy toàn bộ store
  const buyerStore = useBuyerStore();

  // Hoặc chỉ lấy những gì cần
  const buyers = useBuyerStore(state => state.buyers);
  const addBuyer = useBuyerStore(state => state.addBuyer);
  const loading = useBuyerStore(state => state.loading);

  // Sử dụng selectors
  const totalBuyers = useBuyerStore(state => state.getTotalBuyers());
  const buyer = useBuyerStore(state => state.getBuyerById('buyer-id-123'));

  return <View>{/* ... */}</View>;
}
```

## Store Actions

### BuyerStore

- `fetchBuyers()` - Lấy danh sách buyers
- `addBuyer(data)` - Thêm buyer mới
- `updateBuyer(data)` - Cập nhật buyer
- `removeBuyer(id)` - Xóa buyer
- `selectBuyer(id)` - Chọn một buyer
- `clearSelectedBuyer()` - Xóa selected buyer

### TransactionStore

- `fetchTransactions()` - Lấy danh sách transactions
- `addTransaction(data)` - Thêm transaction mới
- `updateTransaction(id, updates)` - Cập nhật transaction
- `removeTransaction(id)` - Xóa transaction
- `fetchTransactionsByDateRange(start, end)` - Lấy transactions theo khoảng thời gian
- `fetchYearlyStats(year)` - Lấy thống kê theo năm
- `setSelectedYear(year)` - Chọn năm

### SettingsStore

- `fetchSettings()` - Lấy settings
- `saveSettings(settings)` - Lưu settings
- `updateSetting(key, value)` - Cập nhật một setting
- `toggleAutoBackup()` - Toggle auto backup
- `toggleFourDigitInput()` - Toggle four digit input
- `getSettingValue(key)` - Lấy giá trị setting generic
- `setSettingValue(key, value)` - Lưu giá trị setting generic

### UIStore

- `openModal()` / `closeModal()` - Quản lý modal
- `openFilterModal()` / `closeFilterModal()` - Quản lý filter modal
- `setFilterType(type)` - Set filter type
- `setSelectedYear(year)` - Set selected year
- `setSearchQuery(query)` - Set search query
- `resetFilters()` - Reset tất cả filters

### SellerStore

- `fetchSellers(buyerId, getSettingValue)` - Lấy sellers của buyer
- `addSeller(buyerId, data, setSettingValue)` - Thêm seller
- `updateSeller(buyerId, sellerId, updates, setSettingValue)` - Cập nhật seller
- `removeSeller(buyerId, sellerId, setSettingValue)` - Xóa seller

### WeighingStore

- `fetchWeighing(buyerId, sellerId, getSettingValue)` - Lấy weighing data
- `saveWeighing(buyerId, sellerId, data, setSettingValue)` - Lưu weighing
- `updateWeighing(buyerId, sellerId, updates, setSettingValue)` - Cập nhật weighing
- `confirmWeighing(buyerId, sellerId, setSettingValue)` - Confirm weighing

## Best Practices

1. **Sử dụng Custom Hooks khi có thể**

   - Hooks tự động fetch data và cleanup
   - Đơn giản hóa component code

2. **Selector cho Performance**

   ```javascript
   // ❌ Không tốt - re-render mỗi khi store thay đổi
   const buyerStore = useBuyerStore();

   // ✅ Tốt - chỉ re-render khi buyers thay đổi
   const buyers = useBuyerStore(state => state.buyers);
   ```

3. **Actions nên async/await**

   ```javascript
   const handleAdd = async () => {
     try {
       await addBuyer({ name: 'Test' });
       Alert.alert('Thành công');
     } catch (error) {
       Alert.alert('Lỗi', error.message);
     }
   };
   ```

4. **Loading và Error States**

   ```javascript
   const { buyers, loading, error } = useBuyers();

   if (loading) return <LoadingSpinner />;
   if (error) return <ErrorMessage message={error} />;
   return <BuyerList buyers={buyers} />;
   ```

## Migration từ Component State

### Trước (useState)

```javascript
function BuyerList() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await listBuyers();
      setBuyers(data);
      setLoading(false);
    };
    load();
  }, []);

  return <View>{/* ... */}</View>;
}
```

### Sau (Zustand)

```javascript
function BuyerList() {
  const { buyers, loading } = useBuyers();
  return <View>{/* ... */}</View>;
}
```

## Debugging

### DevTools

Zustand có thể tích hợp với Redux DevTools:

```javascript
import { devtools } from 'zustand/middleware';

export const useBuyerStore = create(
  devtools(
    (set, get) => ({
      // ... store implementation
    }),
    { name: 'BuyerStore' },
  ),
);
```

### Console Log

```javascript
// Log state mỗi khi thay đổi
useBuyerStore.subscribe(console.log);

// Log specific state
useBuyerStore.subscribe(state => console.log('Buyers:', state.buyers));
```

## Testing

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import { useBuyerStore } from '../stores';

test('should add buyer', async () => {
  const { result } = renderHook(() => useBuyerStore());

  await act(async () => {
    await result.current.addBuyer({ name: 'Test Buyer' });
  });

  expect(result.current.buyers).toHaveLength(1);
  expect(result.current.buyers[0].name).toBe('Test Buyer');
});
```
