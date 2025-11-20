import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

const DATABASE_NAME = 'CanLua.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAY_NAME = 'CanLua Database';
const DATABASE_SIZE = 200000;

let db;

// Initialize database and create tables
export async function initDatabase() {
  try {
    db = await SQLite.openDatabase(
      DATABASE_NAME,
      DATABASE_VERSION,
      DATABASE_DISPLAY_NAME,
      DATABASE_SIZE,
    );

    // Create buyers table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS buyers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        createdAt TEXT NOT NULL,
        totalWeightKg REAL DEFAULT 0,
        totalWeighCount INTEGER DEFAULT 0
      );
    `);

    // Create transactions table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS transactions (
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
    `);

    // Create index for better query performance
    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    `);

    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    `);

    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_transactions_buyerId ON transactions(buyerId);
    `);

    // Create app_settings table for storing configuration
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Get database instance
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Close database connection
export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
    console.log('Database closed');
  }
}

// Execute SQL query with parameters
export async function executeSql(sql, params = []) {
  const database = getDatabase();
  try {
    const [result] = await database.executeSql(sql, params);
    return result;
  } catch (error) {
    console.error('SQL execution error:', error);
    throw error;
  }
}

// Helper function to generate unique ID
export function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
