import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evidenceAnchorsForSurface,
  localHeuristicAuditTrail,
  operatorStepsForSurface,
  priorActivationsForSurface,
  surfaceAuditTrail,
  surfaceAuditTrails,
} from '../../src/audit/trail.js';

const sessionRecord = {
  engine: { version: '5.0.0' },
  operatorEpoch: 'epoch-7',
  priorSnapshot: { id: 'us-news-web@3' },
  sourceHash: 'sha256:source',
  observationHash: 'sha256:observation',
};

test('operator steps are validated against the reserved nine and carry their signature', () => {
  const surface = { id: 'fed_01', derivation: { steps: [
    { operator: 'REF', input: ['@surface:the_Fed'], output: '@referent:fed_01' },
    { operator: 'SIG', input: ['@claim:held_rates'], output: 'weight:0.81' },
  ] } };
  const steps = operatorStepsForSurface(surface);
  assert.deepEqual(steps.map((s) => s.operator), ['REF', 'SIG']);
  assert.equal(steps[0].name, 'Reference');
  assert.equal(steps[0].signature, 'REF(surface → referent) -> referential link');
});

test('an unknown operator in a trace is a hard error, not a silent pass-through', () => {
  const surface = { id: 'x', derivation: { steps: [{ operator: 'MADEUP' }] } };
  assert.throws(() => operatorStepsForSurface(surface), /Unknown operator/);
});

test('priors consulted prefers an explicit per-activation list', () => {
  const surface = { id: 'fed_01', gate_result: { priors_consulted: [
    { pocket_id: 'us-news-web@3', channel: 'priorBond', weight: 0.81 },
  ] } };
  assert.deepEqual(priorActivationsForSurface(surface), [
    { pocketId: 'us-news-web@3', channel: 'priorBond', weight: 0.81 },
  ]);
});

test('priors consulted falls back to the single pinned prior identity on the surface or snapshot', () => {
  const onSurface = { id: 'fed_01', prior_snapshot: { identity: 'us-news-web@3', pocket_version: 'v2' } };
  assert.deepEqual(priorActivationsForSurface(onSurface), [
    { pocketId: 'us-news-web@3', channel: null, weight: null, pocketVersion: 'v2' },
  ]);
  const viaSessionSnapshot = { id: 'fed_01' };
  assert.deepEqual(priorActivationsForSurface(viaSessionSnapshot, { identity: 'gothic-novel@2' }), [
    { pocketId: 'gothic-novel@2', channel: null, weight: null, pocketVersion: null },
  ]);
});

test('no priors consulted is a representable, honest empty list', () => {
  assert.deepEqual(priorActivationsForSurface({ id: 'fed_01' }), []);
});

test('evidence anchors come from provenance anchors or evidence entries', () => {
  assert.deepEqual(evidenceAnchorsForSurface({ id: 'a', provenance: { anchors: ['000184', '000185'] } }), ['000184', '000185']);
  assert.deepEqual(evidenceAnchorsForSurface({ id: 'a', evidence: [{ anchor: '000184' }, { quoteHash: 'no-anchor' }] }), ['000184']);
  assert.deepEqual(evidenceAnchorsForSurface({ id: 'a' }), []);
});

test('surfaceAuditTrail assembles operators, priors, anchors, reason, and session identity', () => {
  const surface = {
    id: 'fed_01',
    name: 'Federal Reserve',
    gate_result: { reason: 'Held rates steady per witnessed statement.' },
    prior_snapshot: { identity: 'us-news-web@3' },
    provenance: { anchors: ['000184', '000185', '000186'] },
    derivation: { steps: [{ operator: 'REF', input: ['@surface:the_Fed'], output: '@referent:fed_01' }] },
  };
  const trail = surfaceAuditTrail(surface, { sessionRecord });
  assert.equal(trail.surfaceId, 'fed_01');
  assert.equal(trail.label, 'Federal Reserve');
  assert.equal(trail.reason, 'Held rates steady per witnessed statement.');
  assert.equal(trail.operators.length, 1);
  assert.deepEqual(trail.priorsActivated, [{ pocketId: 'us-news-web@3', channel: null, weight: null, pocketVersion: null }]);
  assert.deepEqual(trail.evidenceAnchors, ['000184', '000185', '000186']);
  assert.deepEqual(trail.session, {
    engine: sessionRecord.engine,
    operatorEpoch: 'epoch-7',
    priorSnapshot: sessionRecord.priorSnapshot,
    sourceHash: 'sha256:source',
    observationHash: 'sha256:observation',
  });
});

test('surfaceAuditTrail requires an id and omits session when none is given', () => {
  assert.throws(() => surfaceAuditTrail({}), /requires an id/);
  assert.equal(surfaceAuditTrail({ id: 'a' }).session, null);
});

test('surfaceAuditTrails maps a whole projection at once', () => {
  const trails = surfaceAuditTrails([{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(trails.map((t) => t.surfaceId), ['a', 'b']);
});

test('the local heuristic finder gets an honest audit trail: no operators, no priors, real anchors', () => {
  const entity = { id: 'ortiz', name: 'Elena Ortiz', ctx: ['sponsored the Riverton deal', 'quoted on the memo'] };
  const trail = localHeuristicAuditTrail(entity);
  assert.equal(trail.mechanism, 'local-heuristic-finder');
  assert.deepEqual(trail.operators, []);
  assert.deepEqual(trail.priorsActivated, []);
  assert.deepEqual(trail.evidenceAnchors, entity.ctx);
  assert.match(trail.note, /no live EOT operator trace or PriorSnapshot ran/);
});

test('localHeuristicAuditTrail requires an id', () => {
  assert.throws(() => localHeuristicAuditTrail({ name: 'no id' }), /requires an id/);
});
