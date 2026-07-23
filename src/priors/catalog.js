export async function fetchPriorCatalog(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Prior catalog fetch failed: ${response.status} ${response.statusText}`);
  const catalog = await response.json();
  if (catalog.schema !== 'PriorCatalog@1') throw new TypeError('Unsupported prior catalog schema');
  return catalog;
}

export function selectSnapshotFromCatalog(catalog, snapshotId) {
  const snapshot = (catalog.snapshots || []).find((item) => item.id === snapshotId || item.hash === snapshotId);
  if (!snapshot) throw new Error(`Prior snapshot not found in catalog: ${snapshotId}`);
  return snapshot;
}
