import { RECORD_TYPES } from './records.js';

export class AppendOnlyEventLog {
  constructor(storage = globalThis.localStorage, key = 'eoreader.eventLog') { this.storage = storage; this.key = key; }
  readAll() { return JSON.parse(this.storage?.getItem(this.key) || '[]'); }
  append(record) {
    if (!RECORD_TYPES.includes(record?.type)) throw new TypeError(`Unknown append-only record type: ${record?.type}`);
    const all = this.readAll();
    all.push(Object.freeze({ ...record, appendedAt: new Date().toISOString() }));
    this.storage?.setItem(this.key, JSON.stringify(all));
    return all.at(-1);
  }
}
