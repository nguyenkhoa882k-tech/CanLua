# Migration từ AsyncStorage sang SQLite

## Tổng quan

Dự án đã được chuyển đổi từ AsyncStorage sang SQLite để cải thiện hiệu suất và khả năng quản lý dữ liệu.

## Những gì đã được migrate

### ✅ Đã hoàn thành

1. **Buyers (Người mua)**

   - Bảng: `buyers`
   - Các trường: id, name, phone, createdAt, totalWeightKg, totalWeighCount

2. **Transactions (Giao dịch)**

   - Bảng: `transactions`
   - Các trường: id, type, category, amount, date, note, buyerId, weightKg, pricePerKg, createdAt, updatedAt

3. **App Settings (Cài đặt)**

   - Bảng: `app_settings`
   - Lưu trữ dạng key-value

4. **Services đã cập nhật:**

   - ✅ `src/services/database.js` - Database service mới
   - ✅ `src/services/buyers.js` - Sử dụng SQLite
   - ✅ `src/services/transactions.js` - Sử dụng SQLite
   - ✅ `src/services/settings.js` - Service mới cho app settings
   - ✅ `src/services/autoBackup.js` - Cập nhật dùng SQLite
   - ✅ `src/utils/backup.js` - Cập nhật export/import với SQLite
   - ✅ `src/services/migration.js` - Script tự động migrate dữ liệu

5. **Screens đã cập nhật:**
   - ✅ `SettingsScreen.jsx` - Sử dụng settings service mới
   - ✅ `BuyerList.jsx` - Sử dụng SQLite
   - ✅ `BuyerDetail.jsx` - Sử dụng SQLite cho settings
   - ✅ `StatisticsScreen.jsx` - Sử dụng SQLite
   - ✅ `TransactionsScreen.jsx` - Đã dùng service từ trước
   - ✅ `SellerDetail.jsx` - Cập nhật settings

### ⏳ Chưa migrate (vẫn dùng AsyncStorage/app_settings table)

1. **Sellers (Người bán)**

   - Vẫn lưu trong `app_settings` table dưới key `sellers_{buyerId}`
   - Cần tạo bảng `sellers` trong tương lai

2. **Weighing data (Dữ liệu cân)**
   - Vẫn lưu trong `app_settings` table dưới key `weighing_{buyerId}_{sellerId}`
   - Cần tạo bảng `weighings` trong tương lai

## Cấu trúc Database

### Bảng `buyers`

```sql
CREATE TABLE buyers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  createdAt TEXT NOT NULL,
  totalWeightKg REAL DEFAULT 0,
  totalWeighCount INTEGER DEFAULT 0
);
```

### Bảng `transactions`

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  buyerId TEXT,
  weightKg REAL,
  pricePerKg REAL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT,
  FOREIGN KEY (buyerId) REFERENCES buyers(id) ON DELETE SET NULL
);
```

### Bảng `app_settings`

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## Migration tự động

Khi app khởi động lần đầu sau khi cập nhật:

1. Database SQLite được khởi tạo
2. Dữ liệu từ AsyncStorage tự động được migrate sang SQLite
3. Flag `migration_to_sqlite_completed` được lưu để tránh migrate lại
4. Dữ liệu cũ vẫn giữ trong AsyncStorage (có thể xóa thủ công nếu muốn)

## Cách sử dụng

### Import buyers

```javascript
import {
  listBuyers,
  createBuyer,
  updateBuyer,
  deleteBuyer,
  getBuyer,
} from '../services/buyers';

// Lấy danh sách
const buyers = await listBuyers();

// Tạo mới
const newBuyer = await createBuyer({
  name: 'Nguyễn Văn A',
  phone: '0123456789',
});

// Cập nhật
await updateBuyer({ ...buyer, name: 'Tên mới' });

// Xóa
await deleteBuyer(buyerId);
```

### Import transactions

```javascript
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../services/transactions';

// Lấy danh sách
const transactions = await listTransactions();

// Tạo mới
const newTx = await createTransaction({
  type: 'income',
  category: 'Bán lúa',
  amount: 5000000,
  date: new Date().toISOString(),
  note: 'Ghi chú',
});
```

### Import settings

```javascript
import { getSettings, updateSetting, getSetting } from '../services/settings';

// Lấy tất cả settings
const settings = await getSettings();

// Cập nhật một setting
await updateSetting('autoBackup', true);

// Lấy một setting cụ thể
const autoBackup = await getSetting('autoBackup', false);
```

## Backup & Restore

File backup đã được cập nhật để hỗ trợ SQLite:

- Version mới: `2.0.0`
- Export: Lấy dữ liệu từ SQLite và mã hóa
- Import: Giải mã và lưu vào SQLite

## Testing

Để reset migration và test lại:

```javascript
import { resetMigrationFlag } from '../services/migration';
await resetMigrationFlag();
```

## Lưu ý quan trọng

1. **AsyncStorage package vẫn cần thiết** cho:

   - Migration dữ liệu cũ
   - Sellers và weighing data (tạm thời)

2. **Sellers và Weighing data**:

   - Hiện đang lưu trong bảng `app_settings` dưới dạng JSON
   - Cần migrate sang bảng riêng trong tương lai
   - Đang hoạt động bình thường qua `getSettingValue` và `setSettingValue`

3. **Performance**:

   - SQLite nhanh hơn nhiều so với AsyncStorage
   - Hỗ trợ query phức tạp, index, foreign key
   - Backup/restore nhanh hơn

4. **Compatibility**:
   - File backup cũ (version 1.x) vẫn có thể import được
   - File backup mới (version 2.0) dùng SQLite

## Roadmap tiếp theo

1. Tạo bảng `sellers` trong SQLite
2. Tạo bảng `weighings` trong SQLite
3. Migrate sellers và weighing data sang các bảng mới
4. Tối ưu hóa queries với indexes
5. Thêm các statistics queries phức tạp
