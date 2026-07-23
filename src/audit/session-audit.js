export function sessionAudit(sessionRecord) {
  return {
    engine: sessionRecord.engine,
    operatorEpoch: sessionRecord.operatorEpoch,
    priorSnapshot: sessionRecord.priorSnapshot,
    sourceHash: sessionRecord.sourceHash,
    observationHash: sessionRecord.observationHash,
  };
}
