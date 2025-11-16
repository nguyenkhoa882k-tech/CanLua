import * as RNFS from '@dr.pogodin/react-native-fs';
import CryptoJS from 'crypto-js';
import { storage } from '../services/storage';

const BACKUP_VERSION = '1.1.0';
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
  const buyers = (await storage.get('buyers')) || [];
  const transactions = (await storage.get('transactions')) || [];
  const settings = (await storage.get('app_settings')) || {};
  const sellers = {};
  const weighings = [];

  for (const buyer of buyers) {
    const buyerSellers = (await storage.get(`sellers_${buyer.id}`)) || [];
    sellers[buyer.id] = buyerSellers;

    for (const seller of buyerSellers) {
      const weighing = await storage.get(`weighing_${buyer.id}_${seller.id}`);
      if (weighing) {
        weighings.push({
          buyerId: buyer.id,
          sellerId: seller.id,
          data: weighing,
        });
      }
    }
  }

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
  await storage.set('last_backup_path', filePath);
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
  const sellersMap = data.sellers || {};
  const weighings = data.weighings || [];

  await storage.clear();
  await storage.set('buyers', buyers);
  await storage.set('transactions', transactions);
  await storage.set('app_settings', settings);

  await Promise.all(
    Object.entries(sellersMap).map(([buyerId, sellerList]) =>
      storage.set(`sellers_${buyerId}`, sellerList || []),
    ),
  );

  for (const weighing of weighings) {
    if (weighing?.buyerId && weighing?.sellerId) {
      await storage.set(
        `weighing_${weighing.buyerId}_${weighing.sellerId}`,
        weighing.data || null,
      );
    }
  }

  await storage.set('last_backup_path', filePath);

  return {
    buyers: buyers.length,
    transactions: transactions.length,
    weighings: weighings.length,
    filePath,
  };
};
