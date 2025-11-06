import { storage, KEYS } from './storage';

const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export async function listBuyers() {
  return (await storage.get(KEYS.BUYERS)) || [];
}

export async function createBuyer({ name, phone }) {
  const buyers = await listBuyers();
  const now = new Date().toISOString();
  const buyer = {
    id: id(),
    name,
    phone: phone || '',
    createdAt: now,
    totals: { weightKg: 0, weighCount: 0 },
  };
  await storage.set(KEYS.BUYERS, [buyer, ...buyers]);
  return buyer;
}

export async function updateBuyer(updated) {
  const buyers = await listBuyers();
  const next = buyers.map(b => (b.id === updated.id ? { ...b, ...updated } : b));
  await storage.set(KEYS.BUYERS, next);
  return updated;
}

export async function deleteBuyer(id) {
  const buyers = await listBuyers();
  const next = buyers.filter(b => b.id !== id);
  await storage.set(KEYS.BUYERS, next);
  return true;
}

export async function getBuyer(id) {
  const buyers = await listBuyers();
  return buyers.find(b => b.id === id) || null;
}
