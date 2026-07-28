import test from 'node:test';
import assert from 'node:assert/strict';
import { displayableReferents, searchFold, sourceSearchIndex, workspaceEvidenceBase, workspaceSearchIndex } from '../../src/app/fold-contract.js';

const evidence = [{ sourceId: 'npr', passageId: 'p1', quoteHash: 'hash' }];
const sourceV1 = { sourceId: 'npr', version: 'npr@1', normalizedPassages: [{ id: 'p1', text: 'The Federal Reserve left rates unchanged.' }], referents: [
  { id: 'fed', canonicalLabel: 'Federal Reserve', surfaceForms: ['Federal Reserve'], evidence, aliasesResolved: true },
  { id: 'view', canonicalLabel: 'View', surfaceForms: ['View'], evidence, aliasesResolved: true },
  { id: 'raw', canonicalLabel: 'Unresolved Name', surfaceForms: ['Unresolved Name'], evidence: [], aliasesResolved: false },
] };
const sourceV2 = { sourceId: 'riverton', version: 'riverton@1', normalizedPassages: [{ id: 'p1', text: 'Riverton clinic closures were disputed.' }], referents: [] };

test('map admits only canonical evidence-bearing referents', () => {
  assert.deepEqual(displayableReferents(sourceV1).map((ref) => ref.canonicalLabel), ['Federal Reserve']);
});

test('search indexes the committed source fold version and empty query gives guidance', () => {
  const index = sourceSearchIndex(sourceV1);
  assert.deepEqual(index.map((item) => item.foldVersion), ['npr@1']);
  assert.equal(searchFold(index, '').status, 'guidance');
  assert.equal(searchFold(index, 'Federal Reserve').label, 'Evidence found');
  assert.equal(searchFold(index, 'European Central Bank').label, 'No evidence found in this scope');
});

test('workspace search uses only active source fold versions', () => {
  const workspace = { workspaceId: 'reporting', version: 'ws@1', activeSourceFoldVersions: ['npr@1'] };
  assert.equal(workspaceSearchIndex(workspace, { 'npr@1': sourceV1, 'riverton@1': sourceV2 }).length, 1);
  assert.equal(workspaceEvidenceBase(workspace, { 'npr@1': sourceV1, 'riverton@1': sourceV2 }).sourceCount, 1);
});
