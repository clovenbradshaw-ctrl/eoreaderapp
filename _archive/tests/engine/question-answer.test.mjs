import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleAnswer, checkAnswerable, compileQuestion, projectQuestion } from '../../src/engine/question-answer.js';

test('question compiler produces stable plans and evidence roles', () => {
  const plan = compileQuestion('Why did rates remain high?', { currentSourceId: 'fed' });
  assert.equal(plan.intent, 'explain');
  assert.deepEqual(plan.scope.sourceIds, ['fed']);
  assert.ok(plan.requiredEvidenceRoles.includes('causal-or-explanatory-relation'));
});

test('federal reserve entity and relevant claims are not absent', () => {
  const record = { foldVersion: 'f1', sources: [{ id: 'fed', title: 'Reuters' }], referents: [{ id: 'federal-reserve', name: 'Federal Reserve' }], passages: [{ id: 'p1', sourceId: 'fed', sourceTitle: 'Reuters', text: 'The Federal Reserve held interest rates steady while officials discussed inflation.' }] };
  const plan = compileQuestion('Federal Reserve interest rates', { currentSourceId: 'fed' });
  const answer = assembleAnswer(projectQuestion(record, plan));
  assert.notEqual(answer.answerability.status, 'absent');
  assert.ok(answer.findings.every((finding) => finding.trace.length > 0));
});

test('causal answers require causal or explanatory relation evidence', () => {
  const record = { passages: [{ id: 'p1', text: 'The decision occurred after the committee meeting.' }], relationships: [{ id: 'r1', type: 'preceded' }] };
  const plan = compileQuestion('Why did the decision happen?');
  const answerability = checkAnswerable(record, plan);
  assert.equal(answerability.status, 'thin');
  assert.match(answerability.reason, /causal or explanatory relationship/);
});
