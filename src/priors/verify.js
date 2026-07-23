export async function sha256Hex(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(String(bytes));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPriorSnapshot(snapshot, bytes, { engineVersion } = {}) {
  if (snapshot.schema !== 'PriorSnapshot@1') throw new TypeError('Unsupported prior snapshot schema');
  const hash = await sha256Hex(bytes);
  if (snapshot.hash && snapshot.hash !== `sha256:${hash}`) throw new Error('Prior snapshot hash mismatch');
  if (!snapshot.operatorEpoch) throw new TypeError('Prior snapshot missing operator epoch');
  if (!Array.isArray(snapshot.packs)) throw new TypeError('Prior snapshot packs must be listed');
  for (const pack of snapshot.packs) if (!pack.hash) throw new TypeError(`Prior pack ${pack.id || '<unknown>'} missing hash`);
  if (engineVersion && snapshot.engineCompatibility) {
    const { min, max } = snapshot.engineCompatibility;
    if ((min && engineVersion < min) || (max && engineVersion > max)) throw new Error('Prior snapshot is not compatible with selected engine');
  }
  return { id: snapshot.id || `sha256:${hash}`, hash: `sha256:${hash}`, snapshot };
}
