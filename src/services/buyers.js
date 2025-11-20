import { executeSql, generateId } from './database';

export async function listBuyers() {
  try {
    const result = await executeSql(
      'SELECT * FROM buyers ORDER BY createdAt DESC',
    );
    const buyers = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      buyers.push({
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        createdAt: row.createdAt,
        totals: {
          weightKg: row.totalWeightKg || 0,
          weighCount: row.totalWeighCount || 0,
        },
      });
    }
    return buyers;
  } catch (error) {
    console.error('Error listing buyers:', error);
    return [];
  }
}

export async function createBuyer({ name, phone }) {
  const now = new Date().toISOString();
  const buyer = {
    id: generateId(),
    name,
    phone: phone || '',
    createdAt: now,
    totals: { weightKg: 0, weighCount: 0 },
  };

  try {
    await executeSql(
      'INSERT INTO buyers (id, name, phone, createdAt, totalWeightKg, totalWeighCount) VALUES (?, ?, ?, ?, ?, ?)',
      [buyer.id, buyer.name, buyer.phone, buyer.createdAt, 0, 0],
    );
    return buyer;
  } catch (error) {
    console.error('Error creating buyer:', error);
    throw error;
  }
}

export async function updateBuyer(updated) {
  try {
    await executeSql(
      'UPDATE buyers SET name = ?, phone = ?, totalWeightKg = ?, totalWeighCount = ? WHERE id = ?',
      [
        updated.name,
        updated.phone || '',
        updated.totals?.weightKg || 0,
        updated.totals?.weighCount || 0,
        updated.id,
      ],
    );
    return updated;
  } catch (error) {
    console.error('Error updating buyer:', error);
    throw error;
  }
}

export async function deleteBuyer(id) {
  try {
    await executeSql('DELETE FROM buyers WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting buyer:', error);
    return false;
  }
}

export async function getBuyer(id) {
  try {
    const result = await executeSql('SELECT * FROM buyers WHERE id = ?', [id]);
    if (result.rows.length > 0) {
      const row = result.rows.item(0);
      return {
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        createdAt: row.createdAt,
        totals: {
          weightKg: row.totalWeightKg || 0,
          weighCount: row.totalWeighCount || 0,
        },
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting buyer:', error);
    return null;
  }
}
