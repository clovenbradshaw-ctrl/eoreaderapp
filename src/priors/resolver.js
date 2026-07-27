import { PriorSnapshotCache } from './cache.js';
import { verifyPriorSnapshot } from './verify.js';
// eoPriors is a sibling repo, not a vendored/npm dependency of eoreaderapp,
// so it's loaded from GitHub via esm.sh — mirroring how engine-loader.mjs
// loads eoreader5. Pinned to a specific commit for reproducible builds;
// bump EOPRIORS_COMMIT to pick up new prior channels/fixes.
const EOPRIORS_COMMIT = '7ee455b83ed7d86abbcd14e67aa275856e6454c3';
const EOPRIORS_BASE = `https://esm.sh/gh/clovenbradshaw-ctrl/eoPriors@${EOPRIORS_COMMIT}/src`;
const { deriveCentroids, buildBundleFromVectors } = await import(`${EOPRIORS_BASE}/self-derive-centroids.js`);

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
  const { loadCentroids } = await import(`${EOPRIORS_BASE}/compress.js`);
  return loadCentroids();
}

// Build a centroid basis from pre-classified, pre-embedded vectors,
// without re-running the classifier or embedder — useful when a prior
// pass already computed them.
export { deriveCentroids, buildBundleFromVectors };
