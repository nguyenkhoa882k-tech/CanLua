import { storage } from './storage';

const TRANSACTIONS_KEY = 'transactions';

// Transaction types
export const INCOME_TYPES = [
  'Bán lúa',
  'Bán rơm',
  'Bán đồng vịt',
  'Bán khác',
];

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
  const data = await storage.get(TRANSACTIONS_KEY);
  return data || [];
}

export async function createTransaction(transaction) {
  const transactions = await listTransactions();
  const newTransaction = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    ...transaction,
    createdAt: new Date().toISOString(),
  };
  transactions.push(newTransaction);
  await storage.set(TRANSACTIONS_KEY, transactions);
  return newTransaction;
}

export async function updateTransaction(id, updates) {
  const transactions = await listTransactions();
  const index = transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    transactions[index] = { ...transactions[index], ...updates, updatedAt: new Date().toISOString() };
    await storage.set(TRANSACTIONS_KEY, transactions);
    return transactions[index];
  }
  return null;
}

export async function deleteTransaction(id) {
  const transactions = await listTransactions();
  const filtered = transactions.filter(t => t.id !== id);
  await storage.set(TRANSACTIONS_KEY, filtered);
  return true;
}

export async function getTransactionsByDateRange(startDate, endDate) {
  const transactions = await listTransactions();
  return transactions.filter(t => {
    const date = new Date(t.date);
    return date >= startDate && date <= endDate;
  });
}

export async function getTransactionStats(year) {
  const transactions = await listTransactions();
  const yearTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getFullYear() === year;
  });

  const income = yearTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const expense = yearTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return {
    income,
    expense,
    profit: income - expense,
    transactions: yearTransactions,
  };
}
