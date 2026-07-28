import test from 'node:test';
import assert from 'node:assert/strict';
import { STANCES, stanceRowsFromDistribution, validateStanceDistribution } from '../../src/core/cube.js';

test('canonical resolution face has the nine Mode × Object stances', () => {
  assert.equal(STANCES.length, 9);
  assert.deepEqual(STANCES.map((stance) => stance.label), [
    'Clearing', 'Dissecting', 'Unraveling',
    'Tending', 'Binding', 'Tracing',
    'Cultivating', 'Making', 'Composing',
  ]);
});

test('stance distribution validation rejects missing canonical cells', () => {
  assert.equal(validateStanceDistribution(Object.fromEntries(STANCES.map((stance) => [stance.id, 1]))), true);
  assert.throws(() => validateStanceDistribution({ clearing: 1 }), /Missing canonical stance distribution entry: dissecting/);
});

test('stance rows preserve canonical display labels and order', () => {
  const rows = stanceRowsFromDistribution(Object.fromEntries(STANCES.map((stance, index) => [stance.id, index])));
  assert.deepEqual(rows.map(([label]) => label), STANCES.map((stance) => stance.label));
  assert.deepEqual(rows.map(([, pct]) => pct), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});
