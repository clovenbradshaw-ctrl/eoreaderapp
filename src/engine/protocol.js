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


export const QUERY_ALGORITHM_VERSION = 'app-query-reading@0.1';

export const EVIDENCE_CHANNELS = Object.freeze([
  'exact', 'referential', 'claims', 'relational', 'structural', 'transitional', 'cross-source', 'negative'
]);

export const QUESTION_ROLES = Object.freeze([
  'subject', 'relationship', 'time-coordinate-location', 'singular-or-list',
  'comparison-or-disagreement', 'cause-consequence-transition', 'overview-structure'
]);

export function assertQueryRequest(request) {
  if (request?.schema !== 'QueryRequest@1') throw new TypeError('Unsupported query request schema');
  if (!request.query || typeof request.query !== 'string') throw new TypeError('QueryRequest requires a query string');
  if (!request.semanticHead) throw new TypeError('QueryRequest requires a pinned semantic head');
  return Object.freeze({
    scope: { sources: [], filters: [], ...(request.scope || {}) },
    priors: request.priors || null,
    frame: request.frame || 'default',
    lens: request.lens || 'neutral',
    ...request,
  });
}

export function validateQueryReading(reading) {
  if (reading?.schema !== 'QueryReading@1') throw new TypeError('Unsupported query reading schema');
  for (const key of ['query', 'semantic_head', 'normalized_scope', 'question_shape', 'core_evidence', 'coverage', 'required_roles', 'unfilled_roles', 'searched_scope', 'query_reading_hash']) {
    if (reading[key] == null) throw new TypeError(`QueryReading missing ${key}`);
  }
  return reading;
}
