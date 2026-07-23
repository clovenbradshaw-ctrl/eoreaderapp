export const ENGINE_PROTOCOL_VERSION = 1;
export const ENGINE_EVENT_TYPES = Object.freeze({
  progress: 'progress',
  semanticEvent: 'semantic-event',
  snapshot: 'reading-snapshot',
  projection: 'projection-bundle',
  paused: 'paused',
  complete: 'complete',
  error: 'error',
});

export function assertEngineInput(input) {
  const required = ['sourceRecord', 'observationEnvelope', 'observationBlocks', 'sessionRecord'];
  for (const key of required) {
    if (!input || input[key] == null) throw new TypeError(`Engine input missing ${key}`);
  }
  if (!input.sessionRecord.engine?.version) throw new TypeError('SessionRecord must pin engine version');
  if (!input.sessionRecord.priorSnapshot?.id) throw new TypeError('SessionRecord must pin prior snapshot identity');
  return input;
}

export function validateProgress(event) {
  if (event.type !== ENGINE_EVENT_TYPES.progress) return event;
  if (!Number.isInteger(event.completedEvents) || !Number.isInteger(event.totalEvents)) {
    throw new TypeError('Progress must be derived from explicit event counts');
  }
  return event;
}
