// The OVERVIEW dashboard is an app-side *projection*. It invents no data: it
// reconciles and shapes what a reading fold already carries — engine artifacts
// (referent individuation + five-way typing, motif/recurrence families, unit
// surprise), the app's own perceivers (DOM headings, the modeless novelty and
// strain signals), and the resolved prior's per-channel readiness — into one
// dense read.
//
// Two projection decisions are load-bearing and encoded here as named,
// tested behaviors rather than left to the renderer:
//
//   1. DIVISIONS keeps every derivation. A news beat can be cut three ways —
//      a novelty curve (SSM checkerboard), the DOM heading tree (web
//      perceiver), and the strain spine (deviation waveform) — and no single
//      one is authoritative. We present all three side by side under one
//      agreement strip. A boundary only the DOM asserts, where the field
//      shows no change, is not noise to hide: it is usually a promo insert or
//      a smuggled passage, so we flag it.
//
//   2. REFERENTS is headed `sightings → survivors`, not "N entities". The
//      count you start with is sightings; the count that matters is what
//      survived individuation. Making the demotion visible in the headline is
//      what stops the publisher (an APPARATUS frame — nav, byline, promo,
//      footer) from being the biggest node just because it is quoted most.

import { orbitBodiesForReading, isProvenanceReferent } from './provenance-layer.js';

// The five individuation types, in prominence order (cast first, frame last).
// The engine's canonical order is field→emanon→protogon→holon→apparatus; the
// dashboard reads them the other way, most-present to least, because that is
// how the REFERENTS card stacks them.
export const REFERENT_TYPE_ORDER = Object.freeze(['holon', 'emanon', 'protogon', 'field', 'apparatus']);

const CAST_TYPES = Object.freeze(['holon', 'emanon', 'protogon', 'field']);

const TYPE_NOTE = Object.freeze({
  holon: 'named, massive, coupled',
  emanon: 'unnamed, ambient',
  protogon: 'orbited, never present',
  field: 'relational, not a figure',
  apparatus: 'nav, byline, promo, footer',
});

// Derivation identities. `authoritative: false` on all of them is the whole
// point of argument 1 — the strip reconciles, it does not elect a winner.
export const DIVISION_DERIVATIONS = Object.freeze({
  novelty: Object.freeze({ id: 'novelty', label: 'novelty curve (SSM checkerboard)', field: true }),
  dom: Object.freeze({ id: 'dom', label: 'DOM headings (web perceiver)', field: false }),
  strain: Object.freeze({ id: 'strain', label: 'strain spine (deviation waveform)', field: true }),
});

// ── FRAME ───────────────────────────────────────────────────────────────────
export function frameCard(fold = {}) {
  const frame = fold.frame || {};
  return Object.freeze({
    kind: frame.kind || 'news article',
    dispersion: Number.isFinite(frame.dispersion) ? frame.dispersion : null,
    subjectReentry: frame.subject_reentry || frame.subjectReentry || 'fail',
    apparatusNote: frame.apparatus_note || frame.apparatusNote || null,
    overrideAvailable: frame.override_available ?? frame.overrideAvailable ?? true,
  });
}

// ── DIVISIONS (design argument 1) ────────────────────────────────────────────
// Cluster every derivation's boundary marks into canonical boundaries. Each
// boundary opens a beat; its vote count is how many derivations placed a cut
// there. `total` is always the number of derivations, so a strip reads
// "agree v/total" per beat. A boundary carried by exactly the DOM derivation —
// a heading with no novelty and no strain behind it — is `domOnly`: the
// smuggled-passage / promo-insert finding.
export function reconcileDivisions(derivations = [], { tolerance = 0.045 } = {}) {
  const present = derivations.filter(Boolean);
  const total = present.length;
  const marks = [];
  for (const d of present) {
    for (const at of d.cuts || []) marks.push({ at, id: d.id });
  }
  marks.sort((a, b) => a.at - b.at);

  const clusters = [];
  for (const mark of marks) {
    const last = clusters[clusters.length - 1];
    if (last && mark.at - last.mean <= tolerance) {
      last.marks.push(mark);
      last.ids.add(mark.id);
      last.mean = last.marks.reduce((s, m) => s + m.at, 0) / last.marks.length;
    } else {
      clusters.push({ mean: mark.at, marks: [mark], ids: new Set([mark.id]) });
    }
  }

  const beats = clusters.map((cluster, index) => {
    const sources = [...cluster.ids];
    const agree = cluster.ids.size;
    const domOnly = agree === 1 && cluster.ids.has('dom');
    return Object.freeze({
      index: index + 1,
      at: Number(cluster.mean.toFixed(3)),
      agree,
      total,
      sources: Object.freeze(sources),
      contested: agree < total,
      domOnly,
      note: domOnly
        ? 'DOM asserts a section; novelty and strain show no change — likely a promo insert or a smuggled passage'
        : null,
    });
  });

  return Object.freeze({ beats: Object.freeze(beats), total });
}

export function divisionsCard(fold = {}) {
  const raw = (fold.divisions && fold.divisions.derivations) || [];
  // Every derivation is retained verbatim. Nothing is elected.
  const derivations = raw.map((d) => {
    const meta = DIVISION_DERIVATIONS[d.id] || { id: d.id, label: d.label || d.id, field: true };
    return Object.freeze({
      id: meta.id,
      label: d.label || meta.label,
      beatCount: Number.isFinite(d.beats) ? d.beats : (d.cuts || []).length,
      unit: d.unit || (d.id === 'strain' ? 'turns' : 'beats'),
      sparkline: Object.freeze([...(d.sparkline || [])]),
      cuts: Object.freeze([...(d.cuts || [])]),
    });
  });
  const agreement = reconcileDivisions(raw, { tolerance: fold.divisions?.tolerance });
  const contested = agreement.beats.filter((b) => b.contested);
  const smuggled = agreement.beats.filter((b) => b.domOnly);
  return Object.freeze({
    candidateSets: derivations.length,
    derivations: Object.freeze(derivations),
    agreement,
    beats: agreement.beats,
    contestedCount: contested.length,
    smuggled: Object.freeze(smuggled),
  });
}

// ── UNITS ─────────────────────────────────────────────────────────────────
const REGISTERS = Object.freeze(['reported', 'quoted', 'chrome']);

export function unitsCard(fold = {}) {
  const passages = (fold.units && fold.units.passages) || [];
  const register = Object.fromEntries(REGISTERS.map((r) => [r, 0]));
  let belowNull = 0;
  for (const p of passages) {
    if (register[p.register] != null) register[p.register] += 1;
    if (p.belowNull || p.below_null) belowNull += 1;
  }
  const surprise = (fold.signals && fold.signals.surprise && fold.signals.surprise.doc)
    || passages.map((p) => (Number.isFinite(p.surprise) ? p.surprise : 0));
  return Object.freeze({
    count: passages.length,
    surprise: Object.freeze([...surprise]),
    register: Object.freeze(register),
    belowNull,
    boilerplateNote: `${belowNull} of ${passages.length} passages below the boilerplate null`,
  });
}

// ── REFERENTS (design argument 2) ────────────────────────────────────────────
export function referentsCard(fold = {}) {
  const referents = fold.referents || [];
  const { planets } = orbitBodiesForReading(fold);
  const cast = referents.filter((r) => !isProvenanceReferent(r));
  const frameItems = (fold.provenance_layer && fold.provenance_layer.referents)
    || referents.filter(isProvenanceReferent);

  const survivors = cast.length;
  const sightings = Number.isFinite(fold.sightings) ? fold.sightings : (fold.referent_sightings ?? survivors);
  const apparatusSightings = Number.isFinite(fold.apparatus_sightings)
    ? fold.apparatus_sightings
    : frameItems.reduce((sum, item) => sum + (item.count || item.sightings || 0), 0);

  const byType = REFERENT_TYPE_ORDER.map((type) => {
    const isCast = CAST_TYPES.includes(type);
    const count = isCast
      ? cast.filter((r) => (r.individuation_type || r.kind) === type).length
      : apparatusSightings;
    return Object.freeze({ type, count, demoted: !isCast, note: TYPE_NOTE[type] });
  });

  // The biggest raw node is the apparatus frame (184 sightings), but it is
  // demoted out of the cast — the largest *surviving* node is a holon.
  const largestSurvivor = [...cast].sort((a, b) => (b.mass || 0) - (a.mass || 0))[0] || null;

  return Object.freeze({
    header: `${sightings} sightings → ${survivors}`,
    sightings,
    survivors,
    byType: Object.freeze(byType),
    cast: Object.freeze(cast.map((r) => Object.freeze({ id: r.id, name: r.name, type: r.individuation_type || r.kind, mass: r.mass || 0 }))),
    apparatus: Object.freeze({ count: apparatusSightings, demoted: true, note: TYPE_NOTE.apparatus }),
    largestSurvivor: largestSurvivor
      ? Object.freeze({ id: largestSurvivor.id, name: largestSurvivor.name, type: largestSurvivor.individuation_type || largestSurvivor.kind })
      : null,
    // Explicit invariant for argument 2: no apparatus referent is a planet.
    apparatusInCast: planets.some(isProvenanceReferent),
  });
}

// ── RECURRENCE ────────────────────────────────────────────────────────────
export function recurrenceCard(fold = {}) {
  const motifs = fold.motifs || [];
  return Object.freeze({
    families: motifs.length,
    motifs: Object.freeze(motifs.map((m) => Object.freeze({
      id: m.id || null,
      period: m.period_units ?? m.period ?? null,
      instances: Array.isArray(m.instances) ? m.instances.length : (m.instances ?? 0),
      regularity: m.regularity ?? null,
    }))),
  });
}

// ── COVERAGE ────────────────────────────────────────────────────────────────
export function coverageCard(fold = {}) {
  const cov = fold.coverage || {};
  const buckets = cov.buckets || cov.discarded_buckets || {};
  const discardedPct = Number.isFinite(cov.discarded_pct) ? cov.discarded_pct : (cov.discardedPct ?? 0);
  const foldedPct = Number.isFinite(cov.folded_pct) ? cov.folded_pct : (cov.foldedPct ?? (100 - discardedPct));
  return Object.freeze({
    foldedPct,
    discardedPct,
    buckets: Object.freeze({ chrome: buckets.chrome || 0, dup: buckets.dup || 0, nul: buckets.nul || 0 }),
    refoldable: cov.refoldable ?? true,
  });
}

// ── ORBIT ─────────────────────────────────────────────────────────────────
export function orbitCard(fold = {}) {
  const orbit = fold.orbit;
  if (orbit && Array.isArray(orbit.nodes)) {
    const planets = orbit.nodes.filter((n) => n.kind === 'paradigm' || n.kind === 'planet');
    const moons = orbit.nodes.filter((n) => n.kind !== 'paradigm' && n.kind !== 'planet');
    return Object.freeze({
      suns: orbit.suns ?? 1,
      planets: planets.length,
      moons: moons.length,
      nodes: Object.freeze(orbit.nodes.map((n) => Object.freeze({ ...n }))),
    });
  }
  const { planets } = orbitBodiesForReading(fold);
  return Object.freeze({ suns: 1, planets: planets.length, moons: 0, nodes: Object.freeze([]) });
}

// ── READINESS ────────────────────────────────────────────────────────────────
const READINESS_CHANNELS = Object.freeze(['priorMass', 'priorBond', 'priorProp']);
const CHANNEL_FACE = Object.freeze({ priorMass: 'Void · novelty', priorBond: 'Field · coupling', priorProp: 'Atmosphere · what holds' });

export function readinessCard(fold = {}) {
  const prior = fold.prior || {};
  const readiness = prior.readiness || {};
  const channels = READINESS_CHANNELS.map((id) => {
    const ch = readiness[id] || {};
    const ready = ch.ready === true;
    return Object.freeze({
      id,
      face: CHANNEL_FACE[id],
      ready,
      thin: !ready,
      level: Number.isFinite(ch.level) ? ch.level : (ready ? 1 : 0.25),
    });
  });
  const readyCount = channels.filter((c) => c.ready).length;
  return Object.freeze({
    snapshot: prior.snapshot || prior.pocket || null,
    channels: Object.freeze(channels),
    readyCount,
    total: channels.length,
    summary: `${readyCount}/${channels.length} ready`,
    surpriseWeightsProvisional: prior.surprise_weights_provisional ?? prior.surpriseWeightsProvisional ?? false,
  });
}

// ── the whole dashboard ───────────────────────────────────────────────────
export function overviewModel(fold = {}) {
  const source = fold.source || {};
  const referents = referentsCard(fold);
  const readiness = readinessCard(fold);
  return Object.freeze({
    story: Object.freeze({
      publisher: source.publisher || null,
      medium: source.medium || 'Webpage',
      words: source.words ?? null,
      readAtLabel: source.read_at_label || source.readAtLabel || null,
      prior: readiness.snapshot,
      readiness: readiness.summary,
      apparatusDemoted: referents.apparatus.count,
    }),
    frame: frameCard(fold),
    divisions: divisionsCard(fold),
    units: unitsCard(fold),
    referents,
    recurrence: recurrenceCard(fold),
    coverage: coverageCard(fold),
    orbit: orbitCard(fold),
    readiness,
  });
}
