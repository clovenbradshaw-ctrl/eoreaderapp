const PREFIX = 'eoreader.priorSnapshot.';
export class PriorSnapshotCache {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  async put(id, bytes) { this.storage?.setItem(PREFIX + id, typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes)); }
  async get(id) { return this.storage?.getItem(PREFIX + id) || null; }
}
