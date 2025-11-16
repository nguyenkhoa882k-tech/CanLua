import { AppState } from 'react-native';
import { exportEncryptedBackup } from '../utils/backup';
import { storage } from './storage';

export const LAST_AUTO_BACKUP_KEY = 'last_auto_backup_at';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
const REQUIRED_INTERVAL_MS = 24 * 60 * 60 * 1000; // run once per day

let intervalId = null;
let appStateSubscription = null;

const isIntervalElapsed = lastRunIso => {
  if (!lastRunIso) {
    return true;
  }
  const lastRun = new Date(lastRunIso).getTime();
  if (Number.isNaN(lastRun)) {
    return true;
  }
  return Date.now() - lastRun >= REQUIRED_INTERVAL_MS;
};

const ensureAppStateListener = () => {
  if (appStateSubscription) {
    return;
  }

  appStateSubscription = AppState.addEventListener('change', state => {
    if (state === 'active') {
      runAutoBackupIfDue();
    }
  });
};

const clearAppStateListener = () => {
  appStateSubscription?.remove?.();
  appStateSubscription = null;
};

export const runAutoBackupIfDue = async ({ force = false } = {}) => {
  const settings = (await storage.get('app_settings')) || {};
  if (!settings.autoBackup) {
    return null;
  }

  const lastRun = await storage.get(LAST_AUTO_BACKUP_KEY);
  if (!force && !isIntervalElapsed(lastRun)) {
    return null;
  }

  try {
    const result = await exportEncryptedBackup();
    const timestamp = new Date().toISOString();
    await storage.set(LAST_AUTO_BACKUP_KEY, timestamp);
    return { ...result, timestamp };
  } catch (error) {
    console.warn('Auto backup failed', error);
    return null;
  }
};

export const startAutoBackupScheduler = () => {
  ensureAppStateListener();

  if (intervalId) {
    return;
  }

  intervalId = setInterval(() => {
    runAutoBackupIfDue();
  }, CHECK_INTERVAL_MS);

  runAutoBackupIfDue();
};

export const stopAutoBackupScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  clearAppStateListener();
};

export const getLastAutoBackupTime = async () => {
  return (await storage.get(LAST_AUTO_BACKUP_KEY)) || null;
};

export const bootstrapAutoBackupScheduler = async () => {
  const settings = (await storage.get('app_settings')) || {};
  if (settings.autoBackup) {
    startAutoBackupScheduler();
  } else {
    stopAutoBackupScheduler();
  }
};
