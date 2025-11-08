# Cài đặt packages cho tính năng Export/Import

## Packages cần cài:

```bash
npm install react-native-fs
npm install react-native-document-picker
```

## Hoặc với yarn:

```bash
yarn add react-native-fs
yarn add react-native-document-picker
```

## Android: Thêm permissions vào AndroidManifest.xml

File: `android/app/src/main/AndroidManifest.xml`

```xml
<manifest ...>
  <!-- Thêm các permissions này -->
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
  
  <application ...>
    ...
  </application>
</manifest>
```

## Sau khi cài đặt:

1. Chạy lại Metro bundler:
```bash
npm start -- --reset-cache
```

2. Build lại app:
```bash
# Android
npm run android

# iOS
cd ios && pod install && cd ..
npm run ios
```

## Kiểm tra:

- Xuất dữ liệu: File sẽ lưu vào thư mục Downloads (Android) hoặc Documents (iOS)
- Nhập dữ liệu: Chọn file .json đã xuất để khôi phục
