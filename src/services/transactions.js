import { executeSql, generateId } from './database';

// Transaction types
export const INCOME_TYPES = ['Bán lúa', 'Bán rơm', 'Bán đồng vịt', 'Bán khác'];

export const EXPENSE_TYPES = [
  'Phân bón',
  'Thuốc trừ sâu',
  'Làm bờ',
  'Cày xới đất',
  'Tiền giống',
  'Thuốc ốc',
  'Tiền xạ',
  'Phun thuốc',
  'Dặm',
  'Cấy',
  'Diệt cỏ',
  'Bơm nước',
  'Tiền máy gặt',
  'Tiền thuê đất',
  'Chi khác',
];

export async function listTransactions() {
  try {
    const result = await executeSql(
      'SELECT * FROM transactions ORDER BY date DESC, createdAt DESC',
    );
    const transactions = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      transactions.push({
        id: row.id,
        type: row.type,
        category: row.category,
        amount: row.amount,
        date: row.date,
        note: row.note || '',
        buyerId: row.buyerId || null,
        weightKg: row.weightKg || null,
        pricePerKg: row.pricePerKg || null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt || null,
      });
    }
    return transactions;
  } catch (error) {
    console.error('Error listing transactions:', error);
    return [];
  }
}

export async function createTransaction(transaction) {
  const newTransaction = {
    id: generateId(),
    ...transaction,
    createdAt: new Date().toISOString(),
  };

  try {
    await executeSql(
      `INSERT INTO transactions (id, type, category, amount, date, note, buyerId, weightKg, pricePerKg, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTransaction.id,
        newTransaction.type,
        newTransaction.category,
        newTransaction.amount,
        newTransaction.date,
        newTransaction.note || null,
        newTransaction.buyerId || null,
        newTransaction.weightKg || null,
        newTransaction.pricePerKg || null,
        newTransaction.createdAt,
      ],
    );
    return newTransaction;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

export async function updateTransaction(id, updates) {
  try {
    const updatedAt = new Date().toISOString();

    // Build dynamic update query based on provided fields
    const fields = [];
    const values = [];

    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(updates.date);
    }
    if (updates.note !== undefined) {
      fields.push('note = ?');
      values.push(updates.note || null);
    }
    if (updates.buyerId !== undefined) {
      fields.push('buyerId = ?');
      values.push(updates.buyerId || null);
    }
    if (updates.weightKg !== undefined) {
      fields.push('weightKg = ?');
      values.push(updates.weightKg || null);
    }
    if (updates.pricePerKg !== undefined) {
      fields.push('pricePerKg = ?');
      values.push(updates.pricePerKg || null);
    }

    fields.push('updatedAt = ?');
    values.push(updatedAt);
    values.push(id);

    await executeSql(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );

    // Get updated transaction
    const result = await executeSql('SELECT * FROM transactions WHERE id = ?', [
      id,
    ]);
    if (result.rows.length > 0) {
      const row = result.rows.item(0);
      return {
        id: row.id,
        type: row.type,
        category: row.category,
        amount: row.amount,
        date: row.date,
        note: row.note || '',
        buyerId: row.buyerId || null,
        weightKg: row.weightKg || null,
        pricePerKg: row.pricePerKg || null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt || null,
      };
    }
    return null;
  } catch (error) {
    console.error('Error updating transaction:', error);
    return null;
  }
}

export async function deleteTransaction(id) {
  try {
    await executeSql('DELETE FROM transactions WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return false;
  }
}

export async function getTransactionsByDateRange(startDate, endDate) {
  try {
    const result = await executeSql(
      'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [startDate.toISOString(), endDate.toISOString()],
    );
    const transactions = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      transactions.push({
        id: row.id,
        type: row.type,
        category: row.category,
        amount: row.amount,
        date: row.date,
        note: row.note || '',
        buyerId: row.buyerId || null,
        weightKg: row.weightKg || null,
        pricePerKg: row.pricePerKg || null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt || null,
      });
    }
    return transactions;
  } catch (error) {
    console.error('Error getting transactions by date range:', error);
    return [];
  }
}

export async function getTransactionStats(year) {
  try {
    const result = await executeSql(
      `SELECT 
        type,
        SUM(amount) as total
       FROM transactions 
       WHERE strftime('%Y', date) = ?
       GROUP BY type`,
      [year.toString()],
    );

    let income = 0;
    let expense = 0;

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      if (row.type === 'income') {
        income = row.total || 0;
      } else if (row.type === 'expense') {
        expense = row.total || 0;
      }
    }

    // Get all transactions for the year
    const transactionsResult = await executeSql(
      `SELECT * FROM transactions 
       WHERE strftime('%Y', date) = ?
       ORDER BY date DESC`,
      [year.toString()],
    );

    const transactions = [];
    for (let i = 0; i < transactionsResult.rows.length; i++) {
      const row = transactionsResult.rows.item(i);
      transactions.push({
        id: row.id,
        type: row.type,
        category: row.category,
        amount: row.amount,
        date: row.date,
        note: row.note || '',
        buyerId: row.buyerId || null,
        weightKg: row.weightKg || null,
        pricePerKg: row.pricePerKg || null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt || null,
      });
    }

    return {
      income,
      expense,
      profit: income - expense,
      transactions,
    };
  } catch (error) {
    console.error('Error getting transaction stats:', error);
    return {
      income: 0,
      expense: 0,
      profit: 0,
      transactions: [],
    };
  }
}
