import test from 'node:test';
import assert from 'node:assert/strict';
import {
  overviewModel,
  divisionsCard,
  referentsCard,
  reconcileDivisions,
} from '../../src/app/overview-dashboard.js';
import { nprNewsFold } from '../../src/app/__fixtures__/npr-news-fold.js';

test('overview model composes every card from one fold', () => {
  const model = overviewModel(nprNewsFold);
  assert.deepEqual(Object.keys(model), [
    'story', 'frame', 'divisions', 'units', 'referents', 'recurrence', 'coverage', 'orbit', 'readiness',
  ]);
  assert.equal(model.story.publisher, 'NPR');
  assert.equal(model.story.words, 2728);
  assert.equal(model.story.prior, 'us-news-web@3');
  assert.equal(model.story.readiness, '2/3 ready');
  // The demotion surfaces in the story header, not just deep in a card.
  assert.equal(model.story.apparatusDemoted, 184);
});

test('frame types NPR as apparatus, not subject', () => {
  const { frame } = overviewModel(nprNewsFold);
  assert.equal(frame.kind, 'news article');
  assert.equal(frame.dispersion, 0.81);
  assert.equal(frame.subjectReentry, 'fail');
  assert.match(frame.apparatusNote, /APPARATUS/);
  assert.equal(frame.overrideAvailable, true);
});

// ── Design argument 1: DIVISIONS shows all derivations + an agreement strip ──
test('divisions keep every derivation — no winner is elected', () => {
  const { divisions } = overviewModel(nprNewsFold);
  assert.equal(divisions.candidateSets, 3);
  assert.deepEqual(divisions.derivations.map((d) => d.id), ['novelty', 'dom', 'strain']);
  assert.deepEqual(divisions.derivations.map((d) => d.beatCount), [6, 4, 9]);
  assert.equal(divisions.derivations.find((d) => d.id === 'strain').unit, 'turns');
});

test('agreement strip reconciles boundary votes per beat', () => {
  const { divisions } = overviewModel(nprNewsFold);
  assert.equal(divisions.beats.length, 6);
  assert.deepEqual(divisions.beats.map((b) => b.agree), [2, 3, 1, 3, 2, 3]);
  assert.ok(divisions.beats.every((b) => b.total === 3));
});

test('a DOM-only beat is flagged as a smuggled passage, not hidden', () => {
  const { divisions } = overviewModel(nprNewsFold);
  assert.equal(divisions.smuggled.length, 1);
  const beat = divisions.smuggled[0];
  assert.equal(beat.index, 3);
  assert.equal(beat.agree, 1);
  assert.deepEqual(beat.sources, ['dom']);
  assert.ok(beat.domOnly);
  assert.match(beat.note, /promo insert|smuggled/);
});

test('reconciler is deterministic and clusters within tolerance', () => {
  const a = reconcileDivisions([
    { id: 'novelty', cuts: [0.20, 0.50] },
    { id: 'dom', cuts: [0.205, 0.34] },
    { id: 'strain', cuts: [0.198, 0.50] },
  ]);
  // 0.20 / 0.205 / 0.198 collapse to one boundary voted by all three.
  assert.equal(a.beats[0].agree, 3);
  assert.equal(a.beats[1].agree, 1); // 0.34, dom only
  assert.ok(a.beats[1].domOnly);
});

// ── Design argument 2: REFERENTS is sightings → survivors, apparatus demoted ──
test('referents headline is sightings to survivors, not an entity count', () => {
  const { referents } = overviewModel(nprNewsFold);
  assert.equal(referents.header, '196 sightings → 12');
  assert.equal(referents.sightings, 196);
  assert.equal(referents.survivors, 12);
});

test('the apparatus frame is demoted out of the cast and never the biggest node', () => {
  const { referents } = overviewModel(nprNewsFold);
  // NPR carries the greatest raw mass (184) but is not counted among survivors.
  assert.equal(referents.apparatus.count, 184);
  assert.equal(referents.apparatus.demoted, true);
  assert.equal(referents.apparatusInCast, false);
  // The largest surviving node is a holon, not the publisher.
  assert.equal(referents.largestSurvivor.name, 'Mayor Vale');
  assert.equal(referents.largestSurvivor.type, 'holon');
  assert.ok(!referents.cast.some((r) => r.name === 'NPR'));
});

test('referents break down by individuation type with apparatus marked demoted', () => {
  const card = referentsCard(nprNewsFold);
  const byType = Object.fromEntries(card.byType.map((row) => [row.type, row.count]));
  assert.deepEqual(byType, { holon: 9, emanon: 2, protogon: 1, field: 0, apparatus: 184 });
  const apparatusRow = card.byType.find((row) => row.type === 'apparatus');
  assert.equal(apparatusRow.demoted, true);
  assert.ok(card.byType.filter((row) => row.type !== 'apparatus').every((row) => !row.demoted));
  // The cast types sum to survivors; apparatus is not part of that sum.
  const castSum = card.byType.filter((row) => !row.demoted).reduce((s, r) => s + r.count, 0);
  assert.equal(castSum, card.survivors);
});

// ── The remaining cards ──────────────────────────────────────────────────────
test('units report surprise, register split, and the boilerplate null', () => {
  const { units } = overviewModel(nprNewsFold);
  assert.equal(units.count, 27);
  assert.equal(units.surprise.length, 27);
  assert.deepEqual(units.register, { reported: 16, quoted: 6, chrome: 5 });
  assert.equal(units.belowNull, 9);
  assert.match(units.boilerplateNote, /9 of 27/);
});

test('recurrence, coverage, orbit, readiness read their fold fields', () => {
  const model = overviewModel(nprNewsFold);
  assert.equal(model.recurrence.families, 3);

  assert.equal(model.coverage.foldedPct, 87);
  assert.equal(model.coverage.discardedPct, 13);
  assert.deepEqual(model.coverage.buckets, { chrome: 61, dup: 12, nul: 4 });
  assert.equal(model.coverage.refoldable, true);

  assert.equal(model.orbit.suns, 1);
  assert.equal(model.orbit.planets, 6);
  assert.equal(model.orbit.moons, 12);

  assert.equal(model.readiness.summary, '2/3 ready');
  assert.equal(model.readiness.readyCount, 2);
  const priorProp = model.readiness.channels.find((c) => c.id === 'priorProp');
  assert.equal(priorProp.ready, false);
  assert.equal(priorProp.thin, true);
  assert.equal(model.readiness.surpriseWeightsProvisional, true);
});

test('cards are defensive on an empty fold', () => {
  const model = overviewModel({});
  assert.equal(model.divisions.candidateSets, 0);
  assert.equal(model.referents.header, '0 sightings → 0');
  assert.equal(model.units.count, 0);
  assert.equal(model.readiness.summary, '0/3 ready');
});
