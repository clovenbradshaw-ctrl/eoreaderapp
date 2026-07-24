import test from 'node:test';
import assert from 'node:assert/strict';
import { readerLabel, progressiveDisclosureLabels } from '../../src/app/vocabulary.js';
import { intentForMode, layerDefaultsForMode, LAYERS } from '../../src/app/reader-policy.js';
import { selectRegionRenderer } from '../../src/app/region-rendering.js';
import { assertOrbitVisualIsMapped } from '../../src/app/orbit-mapping.js';
import { bindEntityMarks } from '../../src/app/overlay-binding.js';

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
