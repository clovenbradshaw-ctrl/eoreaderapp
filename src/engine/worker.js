import { EOReader5Adapter } from './adapter.js';

self.onmessage = async (message) => {
  const { id, type, input } = message.data || {};
  if (type !== 'run') return;
  const adapter = new EOReader5Adapter();
  try {
    await adapter.run(input, { onEvent: (payload) => self.postMessage({ id, payload }) });
  } catch (error) {
    self.postMessage({ id, payload: { type: 'error', message: error.message } });
  }
};
