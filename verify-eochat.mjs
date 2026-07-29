// Headless harness for eochat.html.
//
// The DC runtime is browser-only, so this executes the <script type="text/x-dc">
// logic block against a minimal DCLogic stub. Two things are checked:
//   1. every {{ binding }} in the template resolves against renderVals(), in
//      each meaningful UI state (cold start, sources, turns, reader, each tab)
//   2. behaviour that has regressed before — turns landing in the active space,
//      persistence reading committed state, citations never being fabricated
//
// Run: node eoreaderapp/verify-eochat.mjs   (exits non-zero on any failure)

// Executes eochat.html's logic block against a minimal DCLogic stub so
// renderVals() can be exercised without a browser.
import { readFileSync } from 'node:fs';

const target = process.argv[2]
  ? new URL(process.argv[2], `file://${process.cwd()}/`)
  : new URL('./eochat.html', import.meta.url);
const html = readFileSync(target, 'utf8');
const tpl = html.slice(0, html.indexOf('<script type="text/x-dc"'));
const logic = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];

class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(u, cb) {
    const patch = typeof u === 'function' ? u(this.state) : u;
    this.state = { ...this.state, ...patch };
    if (cb) cb();
  }
  renderVals() { return {}; }
}
const React = { createElement: (t, p, ...kids) => ({ t, p, kids }) };
global.localStorage = {
  _d: {}, getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; }
};
global.window = { prompt: () => null, location: {} };
// Node 24 defines a getter-only global `navigator`; override the property.
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async () => {} } }, configurable: true, writable: true });
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};
global.fetch = async () => { throw new Error('no network in harness'); };
global.AbortSignal = { timeout: () => null };

const Component = new Function('DCLogic', 'StreamableLogic', 'React',
  logic + '\n;return Component;')(DCLogic, DCLogic, React);

// Template bindings, minus sc-for loop aliases and known props.
const aliases = new Set([...tpl.matchAll(/as="(\w+)"/g)].map(m => m[1]));
const props = new Set(['showGlyphs', 'proxyUrl', 'sessionId', 'true', 'false']);
const used = [...new Set([...tpl.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(m => m[1].split('.')[0]))]
  .filter(k => !aliases.has(k) && !props.has(k));

let FAILURES = 0;

function check(label, mutate) {
  const c = new Component({});
  c.state = { ...c.state };
  // stand in for componentDidMount's loadSession, which is async/networked
  c.state.spaces = [{ id: 'default', name: 'Reading Room', turns: [], retrievals: [], sources: [] }];
  if (mutate) mutate(c);
  let vals;
  try { vals = c.renderVals(); }
  catch (e) { console.log(`✗ ${label}: renderVals THREW — ${e.message}`); return null; }
  const missing = used.filter(k => !(k in vals));
  if (missing.length) FAILURES++;
  console.log(`${missing.length ? '✗' : '✓'} ${label}${missing.length ? ' — unbound: ' + missing.join(', ') : ''}`);
  return vals;
}

const SPACE = (over) => ({ id: 'default', name: 'Reading Room', turns: [], retrievals: [], sources: [], ...over });

const v0 = check('cold start (no data)');
check('with sources', c => { c.state.spaces = [SPACE({ sources: [{ name: 'pg84.txt', glyph: '●', enabled: true }, { name: 'clip.mp4', enabled: false }] })]; });
check('with turns', c => {
  c.state.spaces = [SPACE({
    turns: [{ id: 't1', q: 'How does Victor react?', a: 'Victor flees from the Creature [1].', citations: [{ num: '1' }], retrieval: { source: 'pg84.txt', quote: 'I beheld the wretch' } }],
    retrievals: [{ source: 'pg84.txt', quote: 'I beheld the wretch' }],
    sources: [{ name: 'pg84.txt', enabled: true }]
  })];
});
check('entity selected', c => {
  c.state.spaces = [SPACE({ turns: [{ id: 't1', q: 'Victor and the Creature?', a: 'Victor made the Creature. Victor fled.' }] })];
  c.state.selectedEntity = 'Victor';
});
check('entity selected, no relations', c => {
  c.state.spaces = [SPACE({ turns: [{ id: 't1', q: 'Who is Victor?', a: 'Victor Victor Victor.' }] })];
  c.state.selectedEntity = 'Victor';
});
check('streaming', c => { c.state.streamingLoading = true; c.state.streamingAnswer = 'partial…'; c.state.streamingCitations = []; });
check('reader open', c => {
  c.state.spaces = [SPACE({ sources: [{ name: 'pg84.txt', enabled: true }] })];
  c.state.readerOpen = true; c.state.readerSourceName = 'pg84.txt';
  c.state.readerContent = { 'pg84.txt': 'CHAPTER 5\nIt was on a dreary night of November.\nCHAPTER 6\nMore text.' };
});
for (const tab of ['outline', 'orbit', 'glassbox', 'priors']) {
  check(`tab: ${tab}`, c => { c.state.tab = tab; c.state.spaces = [SPACE({ turns: [{ id: 't1', q: 'Victor and the Creature', a: 'Victor met the Creature.' }] })]; });
}

// ── behavioural assertions ──
console.log('\n── behaviour ──');
const A = (name, cond) => { if (!cond) FAILURES++; console.log(`${cond ? '✓' : '✗'} ${name}`); };

A('cold start shows empty-chat state', v0.showEmptyChat === true);
A('cold start has zero turns', v0.turns.length === 0);
A('no Frankenstein sample data in cold-start vals',
  !JSON.stringify(v0, (k, x) => typeof x === 'function' ? undefined : x).match(/Victor|Creature|Frankenstein/));

{ // send() must land the turn in the active space
  const c = new Component({});
  c.state = { ...c.state, spaces: [SPACE()], draft: 'hello' };
  c.send();
  A('send() appends turn to active space', c.activeSpace().turns.length === 1);
  A('send() clears the draft', c.state.draft === '');
  A('send() renders the new turn', c.renderVals().turns.length === 1);
  A('send() hides the empty state', c.renderVals().showEmptyChat === false);
}
{ // persistence must reflect the committed state
  const c = new Component({});
  c.state = { ...c.state, spaces: [SPACE()], activeSpaceId: 'default' };
  c.updateActiveSpace(sp => ({ ...sp, sources: sp.sources.concat([{ name: 'x.txt', enabled: true }]) }));
  const saved = JSON.parse(localStorage.getItem('eochat.spaces'));
  A('persists post-update state (not stale)', saved[0].sources.length === 1);
}
{ // toggleSource first click must actually disable
  const c = new Component({});
  c.state = { ...c.state, spaces: [SPACE({ sources: [{ name: 'x.txt' }] })], activeSpaceId: 'default' };
  c.toggleSource('x.txt');
  A('toggleSource disables on first click', c.activeSpace().sources[0].enabled === false);
  c.toggleSource('x.txt');
  A('toggleSource re-enables on second click', c.activeSpace().sources[0].enabled === true);
}
{ // fork
  const c = new Component({});
  c.state = { ...c.state, spaces: [SPACE({ turns: [{ id: 'a', q: '1' }, { id: 'b', q: '2' }, { id: 'c', q: '3' }] })], activeSpaceId: 'default' };
  c.forkSpace(1);
  A('fork creates a new space', c.state.spaces.length === 2);
  A('fork truncates turns at the fork point', c.activeSpace().turns.length === 2);
  A('fork switches to the new space', c.state.activeSpaceId !== 'default');
}
{ // entity matcher must not explode on empty corpus
  const c = new Component({});
  c.state = { ...c.state, spaces: [SPACE()], activeSpaceId: 'default' };
  const { regex } = c.buildEntityMatcher();
  A('empty corpus yields no entity regex', regex === null);
  const big = 'x'.repeat(50000);
  const t0 = Date.now();
  const out = c.renderEntityText(big, 'k', () => {});
  A('renderEntityText returns text unchanged on empty corpus', out === big);
  A('renderEntityText is fast on empty corpus (<50ms)', Date.now() - t0 < 50);
}
{ // relations gating
  const c = new Component({});
  c.state = { ...c.state, spaces: [SPACE({ turns: [{ id: 't', q: 'Victor and Elizabeth', a: 'Victor loves Elizabeth.' }] })], activeSpaceId: 'default', selectedEntity: 'Victor' };
  const v = c.renderVals();
  A('relations found for a co-occurring entity', v.selectedEntityRelations.length > 0);
  A('"no relations" hidden when relations exist', v.selectedEntityNoRelations === false);
  c.state.selectedEntity = 'Nobody';
  const v2 = c.renderVals();
  A('"no relations" shown when there are none', v2.selectedEntityNoRelations === true);
}
{ // glass box log
  const c = new Component({});
  c.state = { ...c.state, spaces: [SPACE()], activeSpaceId: 'default', tab: 'glassbox' };
  A('glass box empty before anything happens', c.renderVals().logEmpty === true);
  c.logAdd('\u25cf', 'first event', 'sources');
  c.logAdd('\u22a8', 'second event', 'chat');
  const v = c.renderVals();
  A('log records events', v.filteredLog.length === 2);
  A('log rows carry time/glyph/text', !!v.filteredLog[0].time && !!v.filteredLog[0].glyph && !!v.filteredLog[0].text);
  c.state.glassBoxCategory = 'chat';
  const vf = c.renderVals();
  A('log filter by category works', vf.filteredLog.length === 1);
  A('filtered count is reported honestly', /1 of 2/.test(vf.logCount));
}

console.log('\n── citation grounding ──');
{
  const c = new Component({});
  c.state = { ...c.state, spaces: [SPACE()], activeSpaceId: 'default' };
  const grounding = { sourceCount: 2, tokens: 400, citations: [
    { index: 1, span_id: 'passage:sha256:abc', source_id: '/Users/x/pg84.txt', byte_start: 10, byte_end: 90, score: 0.81, text: 'I beheld the wretch — the miserable monster whom I had created.' },
    { index: 2, span_id: 'passage:sha256:def', source_id: '/Users/x/pg84.txt', byte_start: 90, byte_end: 150, score: 0.72, text: 'He held up the curtain of the bed.' }
  ]};
  const r = c._resolveCitations('Victor flees [1] and later returns [2].', grounding);
  A('resolves [1] to the real source file', r.citations[0].source === 'pg84.txt');
  A('carries the engine span id', r.citations[0].spanId === 'passage:sha256:abc');
  A('carries byte offsets', r.citations[0].byteStart === 10 && r.citations[0].byteEnd === 90);
  A('quote is engine text, not model text', r.citations[0].quote.startsWith('I beheld the wretch'));
  A('all brackets resolved', r.citations.every(x => x.resolved));

  const r2 = c._resolveCitations('Claim with no backing [7].', grounding);
  A('unbacked [7] is marked unresolved', r2.citations[0].resolved === false);
  A('unbacked [7] is NOT given a fake label', !/^Source 7$/.test(r2.citations[0].source));
  A('unbacked [7] reads as a gap', r2.citations[0].source.includes('unresolved'));

  const r3 = c._resolveCitations('Ungrounded answer [1].', null);
  A('no grounding at all ⇒ unresolved, not invented', r3.citations[0].resolved === false);

  const r4 = c._resolveCitations('Repeat [1] and again [1].', grounding);
  A('duplicate brackets dedupe', r4.citations.length === 1);
}

console.log('\n── progressive disclosure ──');
{
  const GROUNDING = { sourceCount: 2, foldedCount: 1, tokens: 412, systemContext: 'You are answering a question grounded in SOURCE MATERIAL below...',
    citations: [
      { index: 1, span_id: 'passage:sha256:abc', source_id: '/Users/x/pg84.txt', byte_start: 42981, byte_end: 43104, score: 0.81, text: 'I beheld the wretch.' },
      { index: 2, span_id: 'passage:sha256:def', source_id: '/Users/x/pg84.txt', byte_start: 43104, byte_end: 43190, score: 0.72, text: 'He held up the curtain.' }
    ], gaps: [] };
  const rich = {
    id: 't1', q: 'How does Victor react?', a: 'Victor flees [1], returning to find it gone [2].',
    model: 'qwen2.5-coder:7b', grounding: GROUNDING, prompt: GROUNDING.systemContext,
    trace: [{ kind: 'call', name: 'verbatim_search', detail: '{"query":"Victor creature"}' }, { kind: 'result', name: 'verbatim_search', detail: '2 passages' }],
    citations: [
      { num: '1', source: 'pg84.txt', spanId: 'passage:sha256:abc', byteStart: 42981, byteEnd: 43104, score: 0.81, quote: 'I beheld the wretch.', resolved: true },
      { num: '2', source: 'pg84.txt', spanId: 'passage:sha256:def', byteStart: 43104, byteEnd: 43190, score: 0.72, quote: 'He held up the curtain.', resolved: true }
    ]
  };
  const mk = (turn) => { const c = new Component({}); c.state = { ...c.state, spaces: [SPACE({ turns: [turn] })], activeSpaceId: 'default' }; return c; };

  const c = mk(rich);
  let v = c.turnVals(rich, 0);
  A('L2 passages offered when evidence exists', v.hasPassages === true);
  A('L2 label counts passages', v.passagesLabel === 'passages (2)');
  A('L2 heading carries engine metrics', v.passagesHeading.includes('2 found') && v.passagesHeading.includes('412 tokens'));
  A('L2 passage shows byte range + score', v.passages[0].meta === 'bytes 42981–43104 · 0.81');
  A('L2 quote is the engine passage', v.passages[0].quote.includes('I beheld the wretch'));
  A('L3 trace offered', v.hasTrace === true && v.traceLabel === 'trace (2)');
  A('L3 heading names the model', v.traceHeading.includes('qwen2.5-coder:7b'));
  A('L3 distinguishes call from result', v.traceRows[0].glyph === '→' && v.traceRows[1].glyph === '←');
  A('L4 raw offered', v.hasRaw === true);
  A('L4 shows the real injected prompt', v.rawPrompt === GROUNDING.systemContext);
  A('fully grounded turn shows no warning', v.ungroundedNotice === null);

  A('all levels start closed', !v.passagesOpen && !v.traceOpen && !v.rawOpen);
  v.togglePassages();
  v = c.turnVals(rich, 0);
  A('opening passages does not open trace/raw', v.passagesOpen && !v.traceOpen && !v.rawOpen);
  v.toggleTrace();
  v = c.turnVals(rich, 0);
  A('levels stack (passages + trace both open)', v.passagesOpen && v.traceOpen);
  v.togglePassages();
  A('levels close independently', !c.turnVals(rich, 0).passagesOpen && c.turnVals(rich, 0).traceOpen);

  // a bare turn must not offer empty panels
  const bare = { id: 't2', q: 'hi', a: 'hello', citations: [] };
  const vb = mk(bare).turnVals(bare, 0);
  A('no passages control when there is no evidence', vb.hasPassages === false);
  A('no trace control when no tools ran', vb.hasTrace === false);
  A('ungrounded turn is called out', /no grounding/i.test(vb.ungroundedNotice || ''));

  // unresolved brackets must be surfaced, not hidden
  const bad = { id: 't3', q: 'q', a: 'Claim [1] and claim [9].', grounding: GROUNDING,
    citations: [{ num: '1', source: 'pg84.txt', quote: 'x', byteStart: 1, byteEnd: 2, score: 0.5, resolved: true },
                { num: '9', source: '⊘ unresolved — no engine passage for [9]', resolved: false }] };
  const vbad = mk(bad).turnVals(bad, 0);
  A('unresolved bracket triggers a warning', /\[9\]/.test(vbad.ungroundedNotice || ''));
  A('unresolved [9] not fabricated as a passage', vbad.passages.every(p => p.num !== '9'));
  A('all retrieved passages still listed', vbad.passages.length === 2);
  A('only the real [1] is marked cited', vbad.passages.filter(p => p.cited).map(p => p.num).join() === '1');

  // separate turns keep independent panel state
  const c2 = new Component({});
  c2.state = { ...c2.state, spaces: [SPACE({ turns: [rich, { ...rich, id: 'tX' }] })], activeSpaceId: 'default' };
  c2.turnVals(rich, 0).togglePassages();
  A('panel state is per-turn', c2.turnVals(rich, 0).passagesOpen === true && c2.turnVals({ ...rich, id: 'tX' }, 1).passagesOpen === false);
}

console.log('\n── retrieved-but-uncited ──');
{
  const G = { sourceCount: 12, foldedCount: 2, tokens: 680, systemContext: 'ctx',
    citations: [
      { index: 1, span_id: 's1', source_id: 'source:/Users/x/Downloads/pg2600.txt:chunk-1179', byte_start: 100, byte_end: 200, score: 0.59, text: 'Pierre went out.' },
      { index: 2, span_id: 's2', source_id: 'source:/Users/x/Downloads/pg2600.txt:chunk-1180', byte_start: 200, byte_end: 300, score: 0.43, text: 'The Frenchman spoke.' }
    ], gaps: [] };
  const mk = (t) => { const c = new Component({}); c.state = { ...c.state, spaces: [SPACE({ turns: [t] })], activeSpaceId: 'default' }; return c; };

  // model answered but cited nothing
  const uncited = { id: 'u1', q: 'Who is Pierre?', a: 'Pierre appears to be a character.', grounding: G, prompt: 'ctx', citations: [] };
  const v = mk(uncited).turnVals(uncited, 0);
  A('retrieved passages still inspectable when uncited', v.hasPassages === true);
  A('all retrieved passages listed', v.passages.length === 2);
  A('uncited passages flagged in meta', v.passages[0].meta.includes('uncited'));
  A('uncited passages visually de-emphasised', v.passages[0].opacity === '.62');
  A('label reports cited-of-retrieved', v.passagesLabel === 'passages (0 of 2 cited)');
  A('warning names the ignored evidence', /retrieved 2 passages, but the answer cites none/.test(v.ungroundedNotice || ''));

  // partially cited
  const partial = { id: 'u2', q: 'q', a: 'Pierre went out [1].', grounding: G,
    citations: [{ num: '1', source: 'pg2600.txt · chunk-1179', quote: 'Pierre went out.', byteStart: 100, byteEnd: 200, score: 0.59, resolved: true }] };
  const vp = mk(partial).turnVals(partial, 0);
  A('cited passage marked cited', vp.passages[0].cited === true);
  A('uncited sibling marked uncited', vp.passages[1].cited === false);
  A('cited passage gets the green rail', vp.passages[0].rail === '#1F5A4C');
  A('partial label counts correctly', vp.passagesLabel === 'passages (1 of 2 cited)');
  A('no false warning when partially cited', vp.ungroundedNotice === null);
}

console.log('\n── source id shortening ──');
{
  const c = new Component({});
  c.state = { ...c.state, spaces: [SPACE()], activeSpaceId: 'default' };
  A('strips path, keeps file + chunk', c._shortSource('source:/Users/mlacy/Downloads/pg2600.txt:chunk-1179') === 'pg2600.txt · chunk-1179');
  A('handles no chunk suffix', c._shortSource('source:/a/b/pg84.txt') === 'pg84.txt');
  A('handles bare filename', c._shortSource('pg84.txt') === 'pg84.txt');
  A('handles null', c._shortSource(null) === '(unnamed source)');
}

console.log(`\n${FAILURES ? '✗ ' + FAILURES + ' failure(s)' : '✓ all checks passed'}`);
process.exit(FAILURES ? 1 : 0);
