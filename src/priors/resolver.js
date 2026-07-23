import { PriorSnapshotCache } from './cache.js';
import { verifyPriorSnapshot } from './verify.js';

export async function resolvePinnedPriorSnapshot(pin, { fetchImpl = fetch, cache = new PriorSnapshotCache(), engineVersion } = {}) {
  if (!pin?.id || !pin?.url) throw new TypeError('Pinned prior requires immutable id and URL');
  const cached = await cache.get(pin.id);
  if (cached) return verifyPriorSnapshot(JSON.parse(cached), cached, { engineVersion });
  const response = await fetchImpl(pin.url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Pinned prior fetch failed: ${response.status} ${response.statusText}`);
  const bytes = await response.text();
  const snapshot = JSON.parse(bytes);
  const verified = await verifyPriorSnapshot(snapshot, bytes, { engineVersion });
  if (verified.id !== pin.id && verified.hash !== pin.id) throw new Error('Fetched snapshot does not match pinned identity');
  await cache.put(pin.id, bytes);
  return verified;
}
