export const RECORD_TYPES = Object.freeze([
  'SourceRecord','CustodyEvent','DecoderRun','ObservationArtifact','SessionRecord','EngineRun','SemanticEvent','EffectRun','ReadingPointer','UserDelta'
]);

export function createSessionRecord({ sourceHash, observationHash, engine, operatorEpoch, priorSnapshot, frame, lens, horizon, policies }) {
  for (const [key, value] of Object.entries({ sourceHash, observationHash, engine, operatorEpoch, priorSnapshot })) {
    if (!value) throw new TypeError(`SessionRecord missing ${key}`);
  }
  return Object.freeze({
    type: 'SessionRecord',
    id: crypto.randomUUID(),
    sourceHash,
    observationHash,
    engine,
    operatorEpoch,
    priorSnapshot,
    frame: frame || 'default',
    lens: lens || 'neutral',
    horizon: horizon || 'session',
    policies: policies || {},
    createdAt: new Date().toISOString(),
  });
}
