export const EOT_OPERATOR_DEFINITIONS = Object.freeze([
  { symbol: 'DIS', name: 'Distinction', role: 'Distinction or boundary', color: '#FF5C5C', glyph: '◇', shape: 'diamond', signature: 'DIS(surface_a | surface_b) -> boundary', output: 'boundary between witnessed surfaces', licenses: 'contrasting witnessed spans or terms', cannot: 'assert identity or causality' },
  { symbol: 'IND', name: 'Indication', role: 'Indication or definition', color: '#FF9F43', glyph: '▸', shape: 'wedge', signature: 'IND(term: value) -> definition', output: 'defined operand', licenses: 'explicit definition or stable indication', cannot: 'invent an unstated referent' },
  { symbol: 'CON', name: 'Connection', role: 'Connection', color: '#FFD93D', glyph: '─', shape: 'link', signature: 'CON(subject → relation → object) -> edge', output: 'relation edge', licenses: 'witnessed relation evidence', cannot: 'upgrade correlation into proof' },
  { symbol: 'REF', name: 'Reference', role: 'Inscription or attribution', color: '#52D273', glyph: '@', shape: 'tag', signature: 'REF(surface → referent) -> referential link', output: 'anchored referent', licenses: 'surface evidence plus resolver support', cannot: 'erase ambiguity without evidence' },
  { symbol: 'SIG', name: 'Significance', role: 'Significance', color: '#20C9B5', glyph: '✦', shape: 'star', signature: 'SIG(claim, weight) -> salience', output: 'weighted significance', licenses: 'fold evidence and policy', cannot: 'add unsupported facts' },
  { symbol: 'REV', name: 'Revision', role: 'Revision', color: '#4D9FFF', glyph: '↺', shape: 'loop', signature: 'REV(target, patch) -> revised record', output: 'audited revision', licenses: 'new evidence or correction', cannot: 'silently mutate prior events' },
  { symbol: 'NUL', name: 'Null', role: 'Null or absence', color: '#8B7CF6', glyph: '∅', shape: 'void', signature: 'NUL(scope, expectation) -> absence', output: 'scoped absence', licenses: 'searched scope and stated expectation', cannot: 'prove global nonexistence' },
  { symbol: 'REC', name: 'Recursion', role: 'Recursion or reflection', color: '#D767D7', glyph: '⟳', shape: 'spiral', signature: 'REC(record) -> reflected record', output: 'recursive inspection', licenses: 'traceable prior record', cannot: 'bootstrap new evidence' },
  { symbol: 'COL', name: 'Collapse', role: 'Collapse or resolution', color: '#F06A9B', glyph: '◆', shape: 'filled diamond', signature: 'COL(candidates) -> resolution', output: 'resolved projection', licenses: 'explicit decision rule', cannot: 'hide rejected candidates' },
]);

export const EOT_OPERATORS = Object.freeze(new Set(EOT_OPERATOR_DEFINITIONS.map((op) => op.symbol)));
export const EOT_ENVELOPES = Object.freeze(new Set(['OBS', 'DER', 'SYS', 'USR']));
export const EOT_SECTIONS = Object.freeze(new Set(['INPUT', 'APPLY', 'OUTPUT', 'TRACE', 'PROVENANCE', 'ADDED_FACTS']));
export const EOT_OPERATOR_COLORS = Object.freeze(Object.fromEntries(EOT_OPERATOR_DEFINITIONS.map((op) => [op.symbol, op.color])));

export function tokenClass(token) {
  if (EOT_OPERATORS.has(token)) return 'operator';
  if (EOT_ENVELOPES.has(token)) return 'envelope';
  if (EOT_SECTIONS.has(token)) return 'section';
  if (/^@/.test(token)) return 'referent';
  if (/^(src|span|from|weight|entity|standing):?/i.test(token)) return 'metadata';
  if (/^\d+(?:\.\d+)?$/.test(token) || /^\d+[–-]\d+$/.test(token)) return 'number';
  return 'operand';
}

export function assertEotVocabulary({ operators = EOT_OPERATOR_DEFINITIONS, envelopes = EOT_ENVELOPES, colorRequests = [] } = {}) {
  if (operators.length !== 9) throw new Error('EOT requires exactly nine operators');
  const symbols = new Set();
  const colors = new Set();
  for (const op of operators) {
    if (!op.symbol || !op.signature) throw new Error('Operator missing its signature');
    if (symbols.has(op.symbol)) throw new Error(`Duplicate operator ${op.symbol}`);
    if (envelopes.has(op.symbol)) throw new Error(`Envelope ${op.symbol} cannot be used as an operator`);
    if (colors.has(op.color)) throw new Error(`Operator color reused by ${op.symbol}`);
    symbols.add(op.symbol); colors.add(op.color);
  }
  for (const request of colorRequests) {
    if (request.className !== 'operator' && colors.has(request.color)) throw new Error('Nonoperator requested an operator color');
  }
  return true;
}
