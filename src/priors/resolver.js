import { PriorSnapshotCache } from './cache.js';
import { verifyPriorSnapshot } from './verify.js';
import { deriveCentroids, buildBundleFromVectors } from '../../../eoPriors/src/self-derive-centroids.js';

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

// Resolve a centroid basis — either from a pinned snapshot (legacy) or
// self-derived from the content being read (the preferred path).
export async function resolveCentroidBasis({ classifier, embedder, spans, minPerCell = 2 } = {}) {
  if (classifier && embedder && spans) {
    return deriveCentroids({ classifier, embedder, spans, minPerCell });
  }
  const { loadCentroids } = await import('../../../eoPriors/src/compress.js');
  return loadCentroids();
}

// Build a centroid basis from pre-classified, pre-embedded vectors,
// without re-running the classifier or embedder — useful when a prior
// pass already computed them.
export { deriveCentroids, buildBundleFromVectors };
