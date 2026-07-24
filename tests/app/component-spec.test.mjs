import test from 'node:test';
import assert from 'node:assert/strict';
import { readerLabel, progressiveDisclosureLabels } from '../../src/app/vocabulary.js';
import { intentForMode, layerDefaultsForMode, LAYERS } from '../../src/app/reader-policy.js';
import { selectRegionRenderer } from '../../src/app/region-rendering.js';
import { assertOrbitVisualIsMapped } from '../../src/app/orbit-mapping.js';
import { bindEntityMarks } from '../../src/app/overlay-binding.js';
import { activeHereReferents, orbitBodiesForReading, provenancePanelModel, renderingForReferent } from '../../src/app/provenance-layer.js';

test('reader labels are source-shape specific with generic fallback', () => {
  assert.equal(readerLabel('Paradigm', 'article'), 'the piece');
  assert.equal(readerLabel('Paradigm', 'book'), 'the work');
  assert.equal(readerLabel('Paradigm', 'mystery'), 'the whole thing');
  assert.deepEqual(progressiveDisclosureLabels('dataset').slice(0, 3), ['the study', 'the framing', 'variable']);
});

test('reading modes are ledger intents and layer defaults stay app-local', () => {
  assert.deepEqual(intentForMode('study', { reading_ref: 'r1' }), { reading_ref: 'r1', mode: 'Study' });
  assert.equal(layerDefaultsForMode('Read')[LAYERS.entityMarks], true);
  assert.equal(layerDefaultsForMode('Read')[LAYERS.surpriseGutter], false);
  assert.equal(layerDefaultsForMode('Study')[LAYERS.disagreementFlags], true);
});

test('region rendering is per-region and shape-conditional', () => {
  const patterned = { motifs: { regularity: { clearsNull: true }, instances: 4 }, confidence: 0.9 };
  assert.equal(selectRegionRenderer(patterned, { sourceShape: 'article' }), 'card-grid');
  assert.equal(selectRegionRenderer(patterned, { sourceShape: 'book' }), 'prose');
  assert.equal(selectRegionRenderer({ confidence: 0.2, tokenCount: 60 }, { sourceShape: 'article' }), 'collapsed');
});

test('orbit visuals must be declared as fold-field mappings', () => {
  assert.equal(assertOrbitVisualIsMapped('orbitalRadius'), 'coupling');
  assert.equal(assertOrbitVisualIsMapped('provenanceRing'), 'provenance_layer.referents');
  assert.throws(() => assertOrbitVisualIsMapped('sparkle'), /Unmapped Orbit visual property/);
});

test('entity binding marks only gate-cleared referents and counts unresolved anchors', () => {
  const fold = { referents: [
    { id: 'a', kind: 'holon', provenance: { anchors: ['ok', 'missing'] } },
    { id: 'b', kind: 'emanon', provenance: { anchors: ['ok'] } },
  ] };
  const bound = bindEntityMarks(fold, (anchor) => anchor === 'ok' ? { collapsed: false } : null);
  assert.equal(bound.marks.length, 1);
  assert.equal(bound.unbound, 1);
});


test('future and frame individuation types are forward tolerant in entity binding', () => {
  const fold = { referents: [
    { id: 'frame', kind: 'apparatus', provenance: { anchors: ['ok'] } },
    { id: 'future', kind: 'something-new', provenance: { anchors: ['ok'] } },
  ] };
  const bound = bindEntityMarks(fold, () => ({ collapsed: false }));
  assert.deepEqual(bound.marks.map((mark) => mark.referentId), ['frame']);
});

test('provenance referents move to the orbit ring with fixed outlined visuals', () => {
  const snapshot = { referents: [
    { id: 'npr', name: 'NPR', individuation_type: 'apparatus', mass: 99 },
    { id: 'mayor', name: 'Mayor Vale', individuation_type: 'holon', mass: 4 },
    { id: 'future', name: 'Future Type', individuation_type: 'unexpected', mass: 8 },
  ] };
  const orbit = orbitBodiesForReading(snapshot);
  assert.deepEqual(orbit.provenanceRing.map((item) => item.id), ['npr']);
  assert.deepEqual(orbit.planets.map((item) => item.id), ['mayor', 'future']);
  assert.equal(renderingForReferent(snapshot.referents[0]).shape, 'outlined-ring');
  assert.equal(renderingForReferent(snapshot.referents[0]).radius, 'fixed');
  assert.equal(renderingForReferent(snapshot.referents[2]).shape, 'filled-disc');
});

test('active-here excludes source frame except non-attributive sightings', () => {
  const referents = [
    { id: 'pub', name: 'NPR', individuation_type: 'apparatus' },
    { id: 'quoted', name: 'Archive', individuation_type: 'apparatus', predicate_class: 'non-attributive' },
    { id: 'person', name: 'Ortiz', individuation_type: 'holon' },
  ];
  const active = activeHereReferents('NPR Archive Ortiz', referents, () => referents);
  assert.deepEqual(active.map((item) => item.id), ['quoted', 'person']);
});

test('provenance panel preserves engine reason and audit fields', () => {
  const snapshot = { referents: [{ id: 'pub', name: 'NPR', individuation_type: 'apparatus', count: 1, gate_result: { reason: 'Engine sentence.' } }], provenance_layer: { referents: [{ id: 'pub', carries: ['a', 'b'], prior_snapshot: { identity: 'prior-1', pocket_version: 'v2' }, archive_status: 'captured' }] } };
  const panel = provenancePanelModel(snapshot);
  assert.equal(panel[0].sublabel, 'Source frame');
  assert.equal(panel[0].reason, 'Engine sentence.');
  assert.deepEqual(panel[0].stats, { carries: 2, mentions: 1, flags: 0 });
  assert.equal(panel[0].priorIdentity, 'prior-1');
  assert.equal(panel[0].priorPocketVersion, 'v2');
  assert.equal(panel[0].archiveStatus, 'captured');
});
