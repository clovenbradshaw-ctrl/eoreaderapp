import { ENGINE_SELECTION } from '../../engine.config.js';
import { assertEngineInput, assertQueryRequest, validateProgress, validateQueryReading, ENGINE_EVENT_TYPES } from './protocol.js';

export class EOReader5Adapter {
  constructor({ engineFactory, workerFactory, store } = {}) {
    this.engineFactory = engineFactory;
    this.workerFactory = workerFactory;
    this.store = store;
    this.selection = ENGINE_SELECTION;
  }

  async run(input, { signal, onEvent } = {}) {
    const checked = assertEngineInput(input);
    if (this.workerFactory) return this.runInWorker(checked, { signal, onEvent });
    const engine = await this.createEngine();
    const stream = engine.read(checked, { signal, continuationToken: checked.continuationToken });
    for await (const event of stream) {
      this.handleEvent(event, onEvent);
    }
  }

  async search(request, { signal } = {}) {
    const checked = assertQueryRequest(request);
    if (this.workerFactory) return this.searchInWorker(checked, { signal });
    const engine = await this.createEngine();
    if (typeof engine.search !== 'function') throw new Error('Selected EOReader5 engine does not expose search(QueryRequest@1)');
    return validateQueryReading(await engine.search(checked, { signal }));
  }

  async searchInWorker(request, { signal } = {}) {
    const worker = this.workerFactory();
    const id = crypto.randomUUID();
    const abort = () => worker.postMessage({ id, type: 'cancel' });
    return new Promise((resolve, reject) => {
      signal?.addEventListener('abort', abort, { once: true });
      worker.onmessage = (message) => {
        const event = message.data;
        if (event.id !== id) return;
        if (event.payload?.type === 'query-reading') resolve(validateQueryReading(event.payload.reading));
        if (event.payload?.type === 'error') reject(new Error(event.payload.message));
      };
      worker.postMessage({ id, type: 'search', request });
    }).finally(() => signal?.removeEventListener('abort', abort));
  }

  async createEngine() {
    if (this.engineFactory) return this.engineFactory();
    // Public package import only. Bundlers may externalize this package until
    // the released EOReader5 engine is installed by the application.
    const mod = await import('@eoreader/engine');
    return mod.createEOReaderEngine({ protocolVersion: 1 });
  }

  async runInWorker(input, { signal, onEvent }) {
    const worker = this.workerFactory();
    const id = crypto.randomUUID();
    const abort = () => worker.postMessage({ id, type: 'cancel' });
    return new Promise((resolve, reject) => {
      signal?.addEventListener('abort', abort, { once: true });
      worker.onmessage = (message) => {
        const event = message.data;
        if (event.id !== id) return;
        try { this.handleEvent(event.payload, onEvent); } catch (error) { reject(error); }
        if (event.payload?.type === ENGINE_EVENT_TYPES.complete) resolve(event.payload);
        if (event.payload?.type === ENGINE_EVENT_TYPES.error) reject(new Error(event.payload.message));
      };
      worker.postMessage({ id, type: 'run', input });
    }).finally(() => signal?.removeEventListener('abort', abort));
  }

  handleEvent(event, onEvent) {
    validateProgress(event);
    if (event?.type === ENGINE_EVENT_TYPES.semanticEvent) this.store?.append(event.record);
    onEvent?.(event);
  }
}
