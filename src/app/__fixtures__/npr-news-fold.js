// A representative reading fold for an NPR politics webpage, read against the
// us-news-web@3 prior. The numbers here are the ones the OVERVIEW mockup is
// built from — they exist so the projection and its renderer can be exercised
// end to end before the engine wires every signal into the live read path.
// Data only, no imports: importable by both the node test and the preview page.

// surprise per passage, one of the 27 units (glyph ▁▂▃▄▅▆▇█ ≈ 1..8)
const SURPRISE = [1, 1, 2, 1, 1, 3, 7, 8, 5, 2, 1, 1, 1, 4, 6, 2, 1, 1, 1, 2, 7, 8, 6, 2, 1, 1, 1];
const REGISTER = [
  'chrome', 'chrome', 'reported', 'reported', 'reported', 'reported', 'quoted', 'quoted', 'quoted', 'reported',
  'reported', 'chrome', 'reported', 'reported', 'reported', 'reported', 'reported', 'reported', 'reported', 'reported',
  'quoted', 'quoted', 'quoted', 'reported', 'reported', 'chrome', 'chrome',
];
const BELOW_NULL = new Set([0, 1, 10, 11, 12, 16, 17, 18, 26]); // 9 of 27 below the boilerplate null

const passages = SURPRISE.map((surprise, i) => ({
  id: `u${i}`,
  register: REGISTER[i],
  surprise,
  belowNull: BELOW_NULL.has(i),
}));

// 12 surviving cast referents (9 holon, 2 emanon, 1 protogon) plus the NPR
// APPARATUS frame. NPR carries the greatest raw mass (184 sightings across
// nav, byline, promo, footer) — which is exactly why it must be demoted, or it
// would dominate the graph as the biggest node.
const cast = [
  { id: 'vale', name: 'Mayor Vale', individuation_type: 'holon', mass: 41, count: 23 },
  { id: 'ortiz', name: 'Sen. Ortiz', individuation_type: 'holon', mass: 33, count: 18 },
  { id: 'council', name: 'City Council', individuation_type: 'holon', mass: 27, count: 15 },
  { id: 'riverton', name: 'Riverton', individuation_type: 'holon', mass: 22, count: 12 },
  { id: 'budget', name: 'the 2026 budget', individuation_type: 'holon', mass: 19, count: 11 },
  { id: 'clinics', name: 'the clinics', individuation_type: 'holon', mass: 16, count: 9 },
  { id: 'measurej', name: 'Measure J', individuation_type: 'holon', mass: 13, count: 7 },
  { id: 'auditor', name: 'the auditor', individuation_type: 'holon', mass: 9, count: 5 },
  { id: 'record', name: 'the 2019 record', individuation_type: 'holon', mass: 7, count: 4 },
  { id: 'department', name: 'the department', individuation_type: 'emanon', mass: 6, count: 8 },
  { id: 'downtown', name: 'downtown', individuation_type: 'emanon', mass: 5, count: 6 },
  { id: 'commission', name: 'the review commission', individuation_type: 'protogon', mass: 4, count: 2 },
];

const nprFrame = { id: 'npr', name: 'NPR', individuation_type: 'apparatus', mass: 184, count: 184 };

export const nprNewsFold = Object.freeze({
  source: Object.freeze({ publisher: 'NPR', medium: 'Webpage', words: 2728, read_at_label: 'read 17m ago' }),

  prior: Object.freeze({
    snapshot: 'us-news-web@3',
    surprise_weights_provisional: true,
    readiness: Object.freeze({
      priorMass: Object.freeze({ ready: true, level: 1 }),
      priorBond: Object.freeze({ ready: true, level: 0.86 }),
      priorProp: Object.freeze({ ready: false, level: 0.25 }), // THIN — omitted from the published channels
    }),
  }),

  frame: Object.freeze({
    kind: 'news article',
    dispersion: 0.81,
    subject_reentry: 'fail',
    apparatus_note: '"NPR" typed APPARATUS — publisher, not subject',
    override_available: true,
  }),

  // Three independent derivations of the beats. None is authoritative; the
  // strip reconciles their boundary votes. Beat 3 is asserted by the DOM
  // heading alone — a section with no novelty and no strain behind it.
  divisions: Object.freeze({
    derivations: Object.freeze([
      Object.freeze({ id: 'novelty', beats: 6, unit: 'beats', cuts: Object.freeze([0.05, 0.20, 0.50, 0.66, 0.82]), sparkline: Object.freeze([1, 2, 5, 8, 3, 1, 2, 6, 8, 2, 1]) }),
      Object.freeze({ id: 'dom', beats: 4, unit: 'beats', cuts: Object.freeze([0.20, 0.34, 0.50, 0.82]) }),
      Object.freeze({ id: 'strain', beats: 9, unit: 'turns', cuts: Object.freeze([0.05, 0.20, 0.50, 0.66, 0.82]) }),
    ]),
  }),

  units: Object.freeze({ passages: Object.freeze(passages) }),

  referents: Object.freeze([nprFrame, ...cast]),
  sightings: 196,
  provenance_layer: Object.freeze({
    referents: Object.freeze([
      Object.freeze({
        id: 'npr',
        name: 'NPR',
        count: 184,
        carries: Object.freeze(['nav', 'byline', 'promo', 'footer']),
        prior_snapshot: Object.freeze({ identity: 'us-news-web', pocket_version: '3' }),
        archive_status: 'captured',
        gate_result: Object.freeze({ reason: 'High mass, high coupling-dispersion, no subject re-entry — provenance frame, not a figure.' }),
      }),
    ]),
  }),

  motifs: Object.freeze([
    Object.freeze({ id: 'attribution', period_units: 3, instances: Object.freeze([{}, {}, {}, {}, {}]), regularity: 0.82 }),
    Object.freeze({ id: 'quote-frame', period_units: 4, instances: Object.freeze([{}, {}, {}]), regularity: 0.71 }),
    Object.freeze({ id: 'promo-card', period_units: 6, instances: Object.freeze([{}, {}]), regularity: 0.63 }),
  ]),

  coverage: Object.freeze({
    folded_pct: 87,
    discarded_pct: 13,
    buckets: Object.freeze({ chrome: 61, dup: 12, nul: 4 }),
    refoldable: true,
  }),

  orbit: Object.freeze({
    suns: 1,
    nodes: Object.freeze([
      Object.freeze({ id: 'vale', label: 'Mayor Vale', kind: 'paradigm', parent: '__doc__', salience: 1.0, color: '#c77dba' }),
      Object.freeze({ id: 'ortiz', label: 'Sen. Ortiz', kind: 'paradigm', parent: '__doc__', salience: 0.8, color: '#5b9bd5' }),
      Object.freeze({ id: 'council', label: 'City Council', kind: 'paradigm', parent: '__doc__', salience: 0.66, color: '#6bbf8a' }),
      Object.freeze({ id: 'riverton', label: 'Riverton', kind: 'paradigm', parent: '__doc__', salience: 0.54, color: '#e0a94c' }),
      Object.freeze({ id: 'budget', label: 'the 2026 budget', kind: 'paradigm', parent: '__doc__', salience: 0.46, color: '#c0662e' }),
      Object.freeze({ id: 'clinics', label: 'the clinics', kind: 'paradigm', parent: '__doc__', salience: 0.39, color: '#7d9b5b' }),
      Object.freeze({ id: 'm1', label: 'the auditor', kind: 'moon', parent: 'vale', salience: 0.2, color: '#8A8A95' }),
      Object.freeze({ id: 'm2', label: 'Measure J', kind: 'moon', parent: 'council', salience: 0.2, color: '#8A8A95' }),
      Object.freeze({ id: 'm3', label: 'the department', kind: 'moon', parent: 'budget', salience: 0.18, color: '#8A8A95' }),
      Object.freeze({ id: 'm4', label: 'downtown', kind: 'moon', parent: 'clinics', salience: 0.16, color: '#8A8A95' }),
      Object.freeze({ id: 'm5', label: 'the 2019 record', kind: 'moon', parent: 'ortiz', salience: 0.16, color: '#8A8A95' }),
      Object.freeze({ id: 'm6', label: 'the review commission', kind: 'moon', parent: 'riverton', salience: 0.14, color: '#8A8A95' }),
      Object.freeze({ id: 'm7', label: 'the deal', kind: 'moon', parent: 'riverton', salience: 0.14, color: '#8A8A95' }),
      Object.freeze({ id: 'm8', label: 'the vote', kind: 'moon', parent: 'council', salience: 0.13, color: '#8A8A95' }),
      Object.freeze({ id: 'm9', label: 'the shortfall', kind: 'moon', parent: 'budget', salience: 0.12, color: '#8A8A95' }),
      Object.freeze({ id: 'm10', label: 'the waitlist', kind: 'moon', parent: 'clinics', salience: 0.12, color: '#8A8A95' }),
      Object.freeze({ id: 'm11', label: 'the memo', kind: 'moon', parent: 'vale', salience: 0.11, color: '#8A8A95' }),
      Object.freeze({ id: 'm12', label: 'the hearing', kind: 'moon', parent: 'ortiz', salience: 0.11, color: '#8A8A95' }),
    ]),
  }),
});

export default nprNewsFold;
