import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  }).filter((path) => /\.(js|ts|mjs)$/.test(path));
}
const sourceFiles = files('src');
const text = (file) => readFileSync(file, 'utf8');

test('only src/engine imports engine packages', () => {
  const offenders = sourceFiles.filter((file) => !file.startsWith('src/engine/')).filter((file) => /@eoreader\/(engine|spec)/.test(text(file)));
  assert.deepEqual(offenders, []);
});

test('only src/priors resolves prior artifacts', () => {
  const offenders = sourceFiles.filter((file) => !file.startsWith('src/priors/')).filter((file) => /from ['"].*priors\/|fetchPriorCatalog|resolvePinnedPriorSnapshot/.test(text(file)));
  assert.deepEqual(offenders, []);
});

test('sense organs do not import output organs', () => {
  assert.deepEqual(sourceFiles.filter((file) => file.startsWith('src/senses/') && /from ['"].*outputs\//.test(text(file))), []);
});

test('output organs do not implement discovery algorithms', () => {
  assert.deepEqual(sourceFiles.filter((file) => file.startsWith('src/outputs/') && /discover|infer.*kind|segment.*boundary/i.test(text(file))), []);
});

test('legacy code cannot be imported by the EOReader5 adapter', () => {
  assert.equal(/legacy-42|src\/legacy/.test(text('src/engine/adapter.js')), false);
});
