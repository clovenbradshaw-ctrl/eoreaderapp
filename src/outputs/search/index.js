export const outputOrgan = Object.freeze({
  rendersEngineProjectionOnly: true,
  projection: 'AnswerObject@1',
  accepts: 'QuestionPlan@1',
  descent: ['meaning', 'structure', 'evidence'],
  answerability: ['answered', 'thin', 'absent', 'contested', 'stale'],
  messaging: false,
  sourceAnchored: true,
  invariant: 'findings must have at least one EvidenceTrace before rendering',
});
