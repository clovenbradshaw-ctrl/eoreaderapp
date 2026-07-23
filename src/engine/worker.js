import { EOReader5Adapter } from './adapter.js';
import { assertQueryRequest, validateQueryReading } from './protocol.js';

self.onmessage = async (message) => {
  const { id, type, input } = message.data || {};
  if (type !== 'run' && type !== 'search') return;
  const adapter = new EOReader5Adapter();
  try {
    if (type === 'search') {
      const engine = await adapter.createEngine();
      if (typeof engine.search !== 'function') throw new Error('Selected EOReader5 engine does not expose search(QueryRequest@1)');
      const reading = validateQueryReading(await engine.search(assertQueryRequest(message.data.request)));
      self.postMessage({ id, payload: { type: 'query-reading', reading } });
      return;
    }
    await adapter.run(input, { onEvent: (payload) => self.postMessage({ id, payload }) });
  } catch (error) {
    self.postMessage({ id, payload: { type: 'error', message: error.message } });
  }
};
