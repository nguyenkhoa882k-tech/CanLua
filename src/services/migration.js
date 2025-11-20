import AsyncStorage from '@react-native-async-storage/async-storage';
import { executeSql } from './database';

// Migration flag key
const MIGRATION_COMPLETED_KEY = 'migration_to_sqlite_completed';

/**
 * Migrate data from AsyncStorage to SQLite
 * This should be called once when the app starts
 */
export async function migrateDataToSQLite() {
  try {
    // Check if migration has already been completed
    const migrationCompleted = await AsyncStorage.getItem(
      MIGRATION_COMPLETED_KEY,
    );
    if (migrationCompleted === 'true') {
      console.log('✅ Migration already completed, skipping...');
      return { success: true, alreadyMigrated: true };
    }

    console.log('🔄 Starting data migration from AsyncStorage to SQLite...');

    // Migrate buyers
    const buyersJson = await AsyncStorage.getItem('buyers');
    if (buyersJson) {
      const buyers = JSON.parse(buyersJson);
      console.log(`📦 Migrating ${buyers.length} buyers...`);

      for (const buyer of buyers) {
        await executeSql(
          'INSERT OR REPLACE INTO buyers (id, name, phone, createdAt, totalWeightKg, totalWeighCount) VALUES (?, ?, ?, ?, ?, ?)',
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
      console.log(`✅ Migrated ${buyers.length} buyers`);
    }

    // Migrate transactions
    const transactionsJson = await AsyncStorage.getItem('transactions');
    if (transactionsJson) {
      const transactions = JSON.parse(transactionsJson);
      console.log(`💰 Migrating ${transactions.length} transactions...`);

      for (const transaction of transactions) {
        await executeSql(
          'INSERT OR REPLACE INTO transactions (id, type, category, amount, date, note, buyerId, weightKg, pricePerKg, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
      console.log(`✅ Migrated ${transactions.length} transactions`);
    }

    // Migrate app settings
    const settingsJson = await AsyncStorage.getItem('app_settings');
    if (settingsJson) {
      console.log('⚙️ Migrating app settings...');

      await executeSql(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        ['app_settings', settingsJson],
      );
      console.log('✅ Migrated app settings');
    }

    // Migrate last auto backup time
    const lastBackup = await AsyncStorage.getItem('last_auto_backup_at');
    if (lastBackup) {
      await executeSql(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        ['last_auto_backup_at', JSON.stringify(lastBackup)],
      );
      console.log('✅ Migrated last backup time');
    }

    // Migrate sellers and weighings (keep in AsyncStorage for now as they're not in SQLite schema yet)
    // These will remain in app_settings table as JSON
    const allKeys = await AsyncStorage.getAllKeys();
    const sellerKeys = allKeys.filter(key => key.startsWith('sellers_'));
    const weighingKeys = allKeys.filter(key => key.startsWith('weighing_'));

    console.log(
      `📋 Found ${sellerKeys.length} seller lists and ${weighingKeys.length} weighings`,
    );

    for (const key of [...sellerKeys, ...weighingKeys]) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        await executeSql(
          'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
          [key, value],
        );
      }
    }
    console.log(`✅ Migrated seller and weighing data to app_settings table`);

    // Mark migration as completed
    await AsyncStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');

    console.log('🎉 Migration completed successfully!');

    return {
      success: true,
      alreadyMigrated: false,
      buyersCount: buyersJson ? JSON.parse(buyersJson).length : 0,
      transactionsCount: transactionsJson
        ? JSON.parse(transactionsJson).length
        : 0,
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Reset migration flag (for testing purposes)
 */
export async function resetMigrationFlag() {
  await AsyncStorage.removeItem(MIGRATION_COMPLETED_KEY);
  console.log('🔄 Migration flag reset');
}
