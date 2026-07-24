const INTENTS = Object.freeze({
  identify: /\b(who|what|when|where|which)\b/i,
  explain: /\b(why|how|cause|because|reason|explain)\b/i,
  compare: /\b(compare|versus|vs\.?|differ|different|contrast)\b/i,
  'trace-change': /\b(change|changed|over time|timeline|revision|became|shift)\b/i,
  quantify: /\b(how many|how much|how often|count|number|rate)\b/i,
  classify: /\b(theme|kind|type|classify|category)\b/i,
  'find-evidence': /\b(evidence|support|passage|cite|source)\b/i,
  'find-gaps': /\b(missing|gap|absent|unanswered|unknown)\b/i,
  hypothetical: /\b(what if|suppose|imagine|hypothetical)\b/i,
});

const DEFAULT_SCOPE = Object.freeze({ sourceIds: [], workspaceWide: false });

export function compileQuestion(question, context = {}) {
  const originalQuestion = String(question || '').trim();
  const normalizedQuestion = originalQuestion.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  const intent = Object.entries(INTENTS).find(([, rx]) => rx.test(originalQuestion))?.[0] || 'identify';
  const sourceIds = context.sourceIds || (context.currentSourceId ? [context.currentSourceId] : []);
  const workspaceWide = Boolean(context.workspaceWide || (!sourceIds.length && context.scope === 'workspace'));
  const plan = {
    originalQuestion,
    normalizedQuestion,
    scope: { ...DEFAULT_SCOPE, sourceIds, workspaceWide, dateRange: context.dateRange },
    intent,
    targets: extractReferentCandidates(normalizedQuestion),
    predicates: extractPredicateCandidates(normalizedQuestion),
    constraints: context.constraints || [],
    comparisonAxes: intent === 'compare' ? ['source', 'claim', 'standing', 'evidence'] : [],
    requiredEvidenceRoles: requiredEvidenceRoles(intent),
    domainPrior: routeDomain({ intent }),
    desiredShape: answerShapeForIntent(intent),
  };
  if (!plan.scope.dateRange) delete plan.scope.dateRange;
  return plan;
}

export function routeDomain(plan) {
  const intent = plan.intent;
  if (intent === 'find-evidence') return { meaning: 0.2, structure: 0.2, existence: 0.6 };
  if (intent === 'explain' || intent === 'trace-change' || intent === 'compare') return { meaning: 0.4, structure: 0.45, existence: 0.15 };
  return { meaning: 0.45, structure: 0.3, existence: 0.25 };
}

export function checkAnswerable(record, plan) {
  const evidence = evidenceTraces(record, plan);
  const rels = relationships(record, plan);
  const missingEvidenceRoles = plan.requiredEvidenceRoles.filter((role) => {
    if (role === 'passage') return evidence.length === 0;
    if (role === 'causal-or-explanatory-relation') return !rels.some((r) => /cause|explain|attributed|because|reason/i.test(r.type || r.label || ''));
    if (role === 'comparison') return new Set(evidence.map((e) => e.sourceId)).size < 2;
    if (role === 'dated-state') return !evidence.some((e) => e.date) && !rels.some((r) => r.date);
    return false;
  });
  const status = missingEvidenceRoles.length ? (evidence.length ? 'thin' : 'absent') : (hasContestation(record, plan) ? 'contested' : 'answered');
  return {
    status,
    reason: missingEvidenceRoles.length ? humanMissingReason(plan, missingEvidenceRoles) : undefined,
    missingEvidenceRoles,
  };
}

export function coarseSurf(record, plan) { return evidenceTraces(record, plan).map((trace) => ({ sourceId: trace.sourceId, anchor: trace.anchor, trace })); }
export function projectQuestion(record, plan) { return { record, plan, regions: coarseSurf(record, plan), answerability: checkAnswerable(record, plan) }; }
export function readSignificance(projection) { return findings(projection.record, projection.plan); }

export function assembleAnswer(projection, plan = projection.plan) {
  const found = findings(projection.record, plan).filter((finding) => finding.trace.length > 0);
  const evidence = found.flatMap((finding) => finding.trace);
  const answerability = projection.answerability || checkAnswerable(projection.record, plan);
  return {
    question: plan.originalQuestion,
    interpretation: { intent: plan.intent, understoodAs: plan.normalizedQuestion, targets: plan.targets },
    scope: { sources: sourceRefs(projection.record, plan), filters: [] },
    answerability,
    verdict: { text: verdictText(answerability, found), standing: found.some((f) => f.standing === 'inferred') ? 'mixed' : 'witnessed', confidenceLabel: answerability.status === 'answered' ? 'moderate' : 'limited' },
    findings: found,
    comparisons: [],
    timeline: [],
    entities: canonicalReferents(projection.record, plan),
    relationships: relationships(projection.record, plan),
    gaps: { missing: answerability.missingEvidenceRoles, unresolved: [], alternativeInterpretations: answerability.status === 'contested' ? ['The record contains competing positions on the same proposition.'] : [] },
    evidence,
    provenance: { foldVersion: projection.record?.foldVersion || projection.record?.version || 'unknown', sourceVersions: sourceRefs(projection.record, plan), generatedAt: new Date().toISOString() },
  };
}

function requiredEvidenceRoles(intent) { return ({ explain: ['passage', 'causal-or-explanatory-relation'], compare: ['passage', 'comparison'], 'trace-change': ['passage', 'dated-state'], 'find-evidence': ['passage'] })[intent] || ['passage']; }
function answerShapeForIntent(intent) { return ({ explain: 'explanatory-chain', compare: 'comparison-matrix', 'trace-change': 'timeline', quantify: 'metric', 'find-gaps': 'coverage-gaps', hypothetical: 'speculative' })[intent] || 'direct-answer'; }
function extractReferentCandidates(n) { return n.split(/\b(?:who|what|when|where|why|how|did|does|do|the|a|an|of|about|in|on|for|to|and|or|is|are|was|were)\b/).map((text) => text.trim()).filter((text) => text.length > 2).slice(0, 4).map((text) => ({ text })); }
function extractPredicateCandidates(n) { return (n.match(/\b(announced|criticized|increased|preceded|attributed|contradicted|corroborated|said|reported|caused|changed)\b/g) || []).map((text) => ({ text })); }
function allText(record) { return [...(record?.passages || []), ...(record?.evidence || [])].map((p) => p.text || p.body || '').join(' ').toLowerCase(); }
function evidenceTraces(record, plan) { const terms = plan.normalizedQuestion.split(' ').filter((t) => t.length > 2); return [...(record?.passages || []), ...(record?.evidence || [])].filter((p) => terms.some((t) => String(p.text || p.body || '').toLowerCase().includes(t))).map((p, i) => ({ id: p.id || `trace-${i}`, sourceId: p.sourceId || p.source_id || 'source', sourceTitle: p.sourceTitle || p.source_title || 'Source', date: p.date, anchor: p.anchor || { kind: 'passage', label: p.label || `Passage ${i + 1}` }, text: p.text || p.body || '' })); }
function canonicalReferents(record, plan) { const text = allText(record); return (record?.referents || record?.entities || []).filter((e) => text.includes(String(e.name || e.canonicalName || '').toLowerCase()) || plan.targets.some((t) => String(e.name || '').toLowerCase().includes(t.text))).map((e) => ({ id: e.id, name: e.name || e.canonicalName, standing: e.standing || 'stated' })); }
function relationships(record, plan) { const ids = new Set(canonicalReferents(record, plan).map((e) => e.id)); return (record?.relationships || record?.relations || []).filter((r) => !ids.size || ids.has(r.source) || ids.has(r.target) || ids.has(r.sourceId) || ids.has(r.targetId)); }
function findings(record, plan) { const traces = evidenceTraces(record, plan); return traces.slice(0, 5).map((trace, i) => ({ id: `finding-${i + 1}`, kind: plan.intent === 'compare' ? 'claim' : 'claim', statement: summarizeTrace(trace), status: 'stated', standing: 'witnessed', weight: Math.max(1, 5 - i), entities: canonicalReferents(record, plan).map((e) => e.id).filter(Boolean), relationIds: relationships(record, plan).map((r) => r.id).filter(Boolean), trace: [trace] })); }
function summarizeTrace(trace) { const s = String(trace.text || '').replace(/\s+/g, ' ').trim(); return s.length > 160 ? `${s.slice(0, 157)}…` : s; }
function hasContestation(record, plan) { return relationships(record, plan).some((r) => /contradict|contest/i.test(r.type || r.label || '')); }
function humanMissingReason(plan, missing) { if (plan.intent === 'explain' && missing.includes('causal-or-explanatory-relation')) return 'The sources include related material, but do not contain a witnessed causal or explanatory relationship for this question.'; if (missing.includes('passage')) return 'No source passage in the selected scope supports an answer to this question.'; return `The selected scope is missing ${missing.join(', ')} evidence.`; }
function verdictText(answerability, found) { if (answerability.status === 'absent' || answerability.status === 'thin') return answerability.reason; return found[0]?.statement || 'The selected evidence supports an answer.'; }
function sourceRefs(record, plan) { const ids = plan.scope.sourceIds.length ? new Set(plan.scope.sourceIds) : null; return (record?.sources || []).filter((s) => !ids || ids.has(s.id)).map((s) => ({ id: s.id, title: s.title || s.name, version: s.version })); }
