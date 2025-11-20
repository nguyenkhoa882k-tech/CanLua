import * as RNFS from '@dr.pogodin/react-native-fs';
import CryptoJS from 'crypto-js';
import { executeSql } from '../services/database';

const BACKUP_VERSION = '2.0.0'; // Version 2.0 for SQLite
// Shared secret for AES encryption; consider moving to secure storage if stronger protection is required.
const BACKUP_SECRET = 'canlua-backup-secret-v1';
const BASE_BACKUP_PATH =
  RNFS.DocumentDirectoryPath ||
  RNFS.DownloadDirectoryPath ||
  RNFS.CachesDirectoryPath ||
  RNFS.TemporaryDirectoryPath;

if (!BASE_BACKUP_PATH) {
  throw new Error('Không xác định được thư mục lưu file sao lưu');
}

const BACKUP_DIR = `${BASE_BACKUP_PATH}/canlua-backups`;
const BACKUP_FILE_EXTENSION = '.clb';
export const BACKUP_DIRECTORY = BACKUP_DIR;
export const BACKUP_DOWNLOAD_DIRECTORY =
  RNFS.DownloadDirectoryPath || BACKUP_DIR;
export const BACKUP_FILE_PREFIX = 'canlua-backup-';
export const getBackupSummary = payload => ({
  buyers: payload.buyers.length,
  transactions: payload.transactions.length,
  weighings: payload.weighings.length,
});

const getAesKey = () => CryptoJS.SHA256(BACKUP_SECRET);
const getAesIv = () => CryptoJS.MD5(BACKUP_SECRET);

const sanitizeTimestamp = value => value.replace(/[:.]/g, '-');

const ensureBackupDirectory = async () => {
  const exists = await RNFS.exists(BACKUP_DIR);
  if (!exists) {
    await RNFS.mkdir(BACKUP_DIR);
  }
};

const collectAppData = async () => {
  // Get buyers from SQLite
  const buyersResult = await executeSql('SELECT * FROM buyers');
  const buyers = [];
  for (let i = 0; i < buyersResult.rows.length; i++) {
    const row = buyersResult.rows.item(i);
    buyers.push({
      id: row.id,
      name: row.name,
      phone: row.phone,
      createdAt: row.createdAt,
      totals: {
        weightKg: row.totalWeightKg || 0,
        weighCount: row.totalWeighCount || 0,
      },
    });
  }

  // Get transactions from SQLite
  const transactionsResult = await executeSql('SELECT * FROM transactions');
  const transactions = [];
  for (let i = 0; i < transactionsResult.rows.length; i++) {
    const row = transactionsResult.rows.item(i);
    transactions.push({
      id: row.id,
      type: row.type,
      category: row.category,
      amount: row.amount,
      date: row.date,
      note: row.note,
      buyerId: row.buyerId,
      weightKg: row.weightKg,
      pricePerKg: row.pricePerKg,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // Get app settings from SQLite
  const settingsResult = await executeSql(
    'SELECT * FROM app_settings WHERE key = ?',
    ['settings'],
  ).catch(() => ({ rows: { length: 0 } }));

  let settings = {};
  if (settingsResult.rows.length > 0) {
    settings = JSON.parse(settingsResult.rows.item(0).value);
  }

  const sellers = {};
  const weighings = [];

  // If you have sellers/weighings tables, add them here
  // For now, keeping empty as they weren't in the original schema

  return { buyers, transactions, settings, sellers, weighings };
};

export const listAvailableBackups = async () => {
  await ensureBackupDirectory();
  const entries = await RNFS.readDir(BACKUP_DIR);
  return entries
    .filter(
      entry => entry.isFile() && entry.name.endsWith(BACKUP_FILE_EXTENSION),
    )
    .map(entry => ({
      name: entry.name,
      path: entry.path,
      size: entry.size,
      createdAt: entry.mtime ? new Date(entry.mtime).toISOString() : null,
    }))
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
};

export const exportEncryptedBackup = async () => {
  const { encrypted, fileName, payload } = await prepareBackupPayload();
  const saved = await saveBackupToDefaults(encrypted, fileName);

  return {
    filePath: saved.filePath,
    fileName,
    buyers: payload.buyers.length,
    transactions: payload.transactions.length,
    weighings: payload.weighings.length,
    encrypted,
  };
};

export const prepareBackupPayload = async () => {
  await ensureBackupDirectory();
  const payload = await collectAppData();
  const exportEnvelope = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...payload,
  };

  const jsonString = JSON.stringify(exportEnvelope);
  const encrypted = CryptoJS.AES.encrypt(jsonString, getAesKey(), {
    iv: getAesIv(),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();

  const fileName = `${BACKUP_FILE_PREFIX}${sanitizeTimestamp(
    new Date().toISOString(),
  )}${BACKUP_FILE_EXTENSION}`;

  return { encrypted, fileName, payload };
};

export const saveBackupToDefaults = async (content, fileName) => {
  const resolvedName =
    fileName ||
    `${BACKUP_FILE_PREFIX}${sanitizeTimestamp(
      new Date().toISOString(),
    )}${BACKUP_FILE_EXTENSION}`;
  const filePath = `${BACKUP_DIR}/${resolvedName}`;
  await RNFS.writeFile(filePath, content, 'utf8');

  // Save last backup path to SQLite
  await executeSql(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    ['last_backup_path', filePath],
  ).catch(() => {});

  return { filePath, fileName: resolvedName };
};

export const copyBackupToDownloads = async ({ encrypted, fileName }) => {
  const downloadsDir = BACKUP_DOWNLOAD_DIRECTORY;
  const destPath = `${downloadsDir}/${fileName}`;
  await RNFS.writeFile(destPath, encrypted, 'utf8');
  return { filePath: destPath, fileName };
};

export const importEncryptedBackup = async filePath => {
  const encrypted = await RNFS.readFile(filePath, 'utf8');
  const decrypted = CryptoJS.AES.decrypt(encrypted, getAesKey(), {
    iv: getAesIv(),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error('Không thể giải mã dữ liệu. File có thể đã bị hỏng.');
  }

  const data = JSON.parse(decrypted);

  const buyers = data.buyers || [];
  const transactions = data.transactions || [];
  const settings = data.settings || {};

  // Clear existing data
  await executeSql('DELETE FROM transactions');
  await executeSql('DELETE FROM buyers');

  // Import buyers
  for (const buyer of buyers) {
    await executeSql(
      'INSERT INTO buyers (id, name, phone, createdAt, totalWeightKg, totalWeighCount) VALUES (?, ?, ?, ?, ?, ?)',
      [
        buyer.id,
        buyer.name,
        buyer.phone || '',
        buyer.createdAt,
        buyer.totals?.weightKg || 0,
        buyer.totals?.weighCount || 0,
      ],
    );
  }

  // Import transactions
  for (const transaction of transactions) {
    await executeSql(
      'INSERT INTO transactions (id, type, category, amount, date, note, buyerId, weightKg, pricePerKg, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        transaction.id,
        transaction.type,
        transaction.category,
        transaction.amount,
        transaction.date,
        transaction.note || null,
        transaction.buyerId || null,
        transaction.weightKg || null,
        transaction.pricePerKg || null,
        transaction.createdAt,
        transaction.updatedAt || null,
      ],
    );
  }

  // Import settings
  if (Object.keys(settings).length > 0) {
    await executeSql(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      ['settings', JSON.stringify(settings)],
    ).catch(() => {});
  }

  // Save last backup path
  await executeSql(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    ['last_backup_path', filePath],
  ).catch(() => {});

  return {
    buyers: buyers.length,
    transactions: transactions.length,
    weighings: 0,
    filePath,
  };
};
