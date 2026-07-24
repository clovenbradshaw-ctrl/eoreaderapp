// Renderer for the OVERVIEW dashboard. This is an output organ: it draws an
// already-built view-model (see src/app/overview-dashboard.js) and computes
// nothing about the source. Every number it shows was decided upstream.
//
// mountOverviewDashboard(root, model, opts) builds the eight cards into `root`
// and returns a teardown function. It is theme-driven: pass a `theme` token
// bag (see THEMES) so the same markup reads in light or dark.

export const THEMES = Object.freeze({
  light: Object.freeze({
    bg: '#f4f1ea', panel: '#fbfaf6', card: '#ffffff', border: '#e4dfd2', bar: '#efece2',
    text: '#15181e', mut: '#6d6a60', faint: '#a09b8d', accent: '#c0662e', warn: '#b8791f',
    track: '#e7e2d5', good: '#3f7a55',
  }),
  dark: Object.freeze({
    bg: '#14161b', panel: '#191c23', card: '#1e222b', border: '#2c313c', bar: '#242833',
    text: '#e9e7df', mut: '#9a9aa6', faint: '#63636f', accent: '#e08a4c', warn: '#e0b24c',
    track: '#2a2f3a', good: '#5fae7f',
  }),
});

const TYPE_COLOR = Object.freeze({
  holon: '#5fae7f', emanon: '#5b9bd5', protogon: '#c77dba', field: '#8a8a95', apparatus: '#9a7b52',
});
const REGISTER_COLOR = Object.freeze({ reported: '#5fae7f', quoted: '#5b9bd5', chrome: '#9a7b52' });

const MONO = "'IBM Plex Mono','SFMono-Regular',ui-monospace,monospace";
const UI = 'system-ui,-apple-system,sans-serif';

function el(tag, style, text) {
  const node = document.createElement(tag);
  if (style) node.setAttribute('style', style);
  if (text != null) node.textContent = text;
  return node;
}
function frag(...kids) {
  const f = document.createDocumentFragment();
  for (const k of kids) if (k) f.appendChild(k);
  return f;
}

// A tiny bar sparkline. values are unitless; the tallest sets full height.
function spark(values, t, color) {
  const wrap = el('div', `display:flex;align-items:flex-end;gap:2px;height:34px`);
  const max = Math.max(1, ...values);
  for (const v of values) {
    const h = Math.max(2, Math.round((v / max) * 32));
    wrap.appendChild(el('div', `width:100%;min-width:1px;flex:1;height:${h}px;background:${color || t.accent};border-radius:1px;opacity:${0.35 + 0.65 * (v / max)}`));
  }
  return wrap;
}

function meter(fraction, t, color) {
  const track = el('div', `flex:1;height:7px;background:${t.track};border-radius:4px;overflow:hidden`);
  track.appendChild(el('div', `width:${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%;height:100%;background:${color || t.accent}`));
  return track;
}

function cardShell(t, title, right) {
  const card = el('section', `background:${t.card};border:1px solid ${t.border};border-radius:14px;padding:13px 14px;display:flex;flex-direction:column;gap:10px;min-width:0;max-width:100%;overflow-x:hidden;box-sizing:border-box`);
  const head = el('div', 'display:flex;align-items:center;gap:8px');
  head.appendChild(el('div', `font:800 10px ${UI};letter-spacing:.1em;color:${t.mut}`, title));
  if (right) {
    const r = el('div', `margin-left:auto;font:600 10.5px ${MONO};color:${t.faint}`, right);
    head.appendChild(r);
  }
  card.appendChild(head);
  return card;
}

function kv(t, label, value, valueColor) {
  const row = el('div', 'display:flex;align-items:baseline;gap:8px');
  row.appendChild(el('div', `font:600 11px ${UI};color:${t.mut};min-width:74px`, label));
  row.appendChild(el('div', `font:700 12px ${MONO};color:${valueColor || t.text}`, value));
  return row;
}

// ── the eight cards ─────────────────────────────────────────────────────────

function storyHeader(t, story) {
  const wrap = el('header', `display:flex;flex-wrap:wrap;align-items:flex-end;gap:6px 18px;padding:2px 2px 4px`);
  const left = el('div', 'display:flex;flex-direction:column;gap:2px;min-width:0');
  left.appendChild(el('div', `font:800 10px ${UI};letter-spacing:.12em;color:${t.mut}`, 'STORY'));
  left.appendChild(el('div', `font:800 22px ${UI};color:${t.text};line-height:1.1`, story.publisher || 'Source'));
  left.appendChild(el('div', `font:500 11.5px ${UI};color:${t.mut}`, [story.medium, story.words != null ? `${story.words} words` : null, story.readAtLabel].filter(Boolean).join(' · ')));
  wrap.appendChild(left);
  const right = el('div', 'display:flex;flex-direction:column;gap:3px;margin-left:auto;text-align:right');
  right.appendChild(el('div', `font:700 11px ${MONO};color:${t.accent}`, `prior: ${story.prior || '—'}`));
  right.appendChild(el('div', `font:600 11px ${MONO};color:${t.mut}`, `readiness: ${story.readiness}`));
  right.appendChild(el('div', `font:600 11px ${MONO};color:${t.faint}`, `apparatus demoted: ${story.apparatusDemoted}`));
  wrap.appendChild(right);
  return wrap;
}

function frameCardEl(t, frame) {
  const card = cardShell(t, 'FRAME', frame.overrideAvailable ? 'override ⃝' : null);
  const line = [frame.kind,
    frame.dispersion != null ? `ρ-dispersion ${frame.dispersion}` : null,
    `subject re-entry: ${frame.subjectReentry}`].filter(Boolean).join('   ·   ');
  card.appendChild(el('div', `font:600 12px ${MONO};color:${t.text}`, line));
  if (frame.apparatusNote) card.appendChild(el('div', `font:500 12px ${UI};color:${t.mut}`, frame.apparatusNote));
  return card;
}

function divisionsCardEl(t, divisions) {
  const card = cardShell(t, 'DIVISIONS', `${divisions.candidateSets} candidate sets ›`);
  // Every derivation, retained. No winner.
  for (const d of divisions.derivations) {
    const row = el('div', 'display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;min-width:0');
    row.appendChild(el('div', `font:700 12px ${UI};color:${d.id === 'dom' ? t.warn : t.text};flex:1 1 auto;min-width:0`, d.label));
    row.appendChild(el('div', `font:700 11px ${MONO};color:${t.mut};white-space:nowrap`, `${d.beatCount} ${d.unit}`));
    if (d.sparkline && d.sparkline.length) {
      const s = spark(d.sparkline, t, t.mut);
      s.setAttribute('style', s.getAttribute('style') + ';width:100%;max-width:120px;flex:1 1 80px;min-width:0;height:22px');
      row.appendChild(s);
    }
    card.appendChild(row);
  }
  // The agreement strip: one segment per reconciled beat, vote count beneath.
  const stripWrap = el('div', 'display:flex;flex-direction:column;gap:4px;margin-top:2px');
  const strip = el('div', 'display:flex;gap:3px');
  const votes = el('div', 'display:flex;gap:3px');
  for (const b of divisions.beats) {
    const contested = b.domOnly ? t.warn : (b.contested ? t.faint : t.good);
    const seg = el('div', `flex:1;height:8px;border-radius:2px;background:${contested};opacity:${b.domOnly ? 1 : 0.55}`);
    strip.appendChild(seg);
    const label = el('div', `flex:1;text-align:center;font:600 9.5px ${MONO};color:${b.domOnly ? t.warn : t.mut}`, `${b.agree}/${b.total}${b.domOnly ? ' ⚠' : ''}`);
    votes.appendChild(label);
  }
  stripWrap.appendChild(strip);
  stripWrap.appendChild(votes);
  card.appendChild(stripWrap);
  for (const b of divisions.smuggled) {
    card.appendChild(el('div', `font:500 11px ${UI};color:${t.warn};background:${t.bar};border-radius:8px;padding:6px 8px`, `beat ${b.index}: ${b.note}`));
  }
  return card;
}

function unitsCardEl(t, units) {
  const card = cardShell(t, 'UNITS', `${units.count} passages ›`);
  card.appendChild(spark(units.surprise, t, t.accent));
  const legend = el('div', 'display:flex;justify-content:space-between');
  legend.appendChild(el('div', `font:500 10px ${MONO};color:${t.faint}`, '╰ boilerplate ╯'));
  legend.appendChild(el('div', `font:500 10px ${MONO};color:${t.faint}`, '╰ substance ╯'));
  card.appendChild(legend);
  const reg = el('div', 'display:flex;flex-direction:column;gap:5px;margin-top:2px');
  const total = Math.max(1, units.register.reported + units.register.quoted + units.register.chrome);
  for (const name of ['reported', 'quoted', 'chrome']) {
    const r = el('div', 'display:flex;align-items:center;gap:8px');
    r.appendChild(el('div', `font:600 10.5px ${UI};color:${t.mut};min-width:60px`, name));
    r.appendChild(meter(units.register[name] / total, t, REGISTER_COLOR[name]));
    r.appendChild(el('div', `font:700 10.5px ${MONO};color:${t.text};min-width:20px;text-align:right`, String(units.register[name])));
    reg.appendChild(r);
  }
  card.appendChild(reg);
  card.appendChild(el('div', `font:500 11px ${UI};color:${t.mut}`, units.boilerplateNote));
  return card;
}

function referentsCardEl(t, referents) {
  const card = cardShell(t, 'REFERENTS', `${referents.sightings} sightings  →  ${referents.survivors}`);
  const headline = el('div', 'display:flex;align-items:baseline;gap:8px');
  headline.appendChild(el('div', `font:800 20px ${MONO};color:${t.text}`, `${referents.sightings}`));
  headline.appendChild(el('div', `font:700 16px ${MONO};color:${t.faint}`, '→'));
  headline.appendChild(el('div', `font:800 20px ${MONO};color:${t.good}`, `${referents.survivors}`));
  headline.appendChild(el('div', `font:500 11px ${UI};color:${t.mut}`, 'survived individuation'));
  card.appendChild(headline);
  // Cast types are scaled to the cast (so 9 holons read as a full bar), not to
  // the apparatus count — the demoted frame keeps its own hollow scale so it
  // never dominates the cast just because it is quoted most.
  const maxCast = Math.max(1, ...referents.byType.filter((row) => !row.demoted).map((row) => row.count));
  for (const row of referents.byType) {
    const line = el('div', `display:flex;align-items:center;gap:8px;${row.demoted ? 'opacity:.7' : ''}`);
    line.appendChild(el('div', `font:700 10.5px ${MONO};color:${TYPE_COLOR[row.type]};min-width:64px`, row.type));
    const track = el('div', `flex:1;height:8px;border-radius:4px;overflow:hidden;background:${t.track}`);
    const width = row.demoted ? 100 : Math.round((row.count / maxCast) * 100);
    const fill = el('div', `width:${width}%;height:100%;background:${TYPE_COLOR[row.type]}`);
    if (row.demoted) fill.setAttribute('style', fill.getAttribute('style') + `;background:repeating-linear-gradient(90deg, ${TYPE_COLOR[row.type]} 0 2px, transparent 2px 5px);opacity:.6`);
    track.appendChild(fill);
    line.appendChild(track);
    line.appendChild(el('div', `font:700 10.5px ${MONO};color:${t.text};min-width:26px;text-align:right`, String(row.count)));
    line.appendChild(el('div', `font:500 10px ${UI};color:${t.faint};min-width:118px`, row.note));
    card.appendChild(line);
  }
  card.appendChild(el('div', `font:500 10.5px ${UI};color:${t.warn}`, `${referents.apparatus.count} apparatus sightings demoted — the publisher is a frame, not the biggest node`));
  return card;
}

function recurrenceCardEl(t, recurrence) {
  const card = cardShell(t, 'RECURRENCE', `${recurrence.families} motif families ›`);
  for (const m of recurrence.motifs) {
    const row = el('div', 'display:flex;align-items:center;gap:8px');
    row.appendChild(el('div', `font:700 11px ${UI};color:${t.text};flex:1`, m.id || 'motif'));
    row.appendChild(el('div', `font:600 10px ${MONO};color:${t.mut}`, `period ${m.period} · ×${m.instances}`));
    if (m.regularity != null) row.appendChild(meter(m.regularity, t, t.good));
    card.appendChild(row);
  }
  return card;
}

function coverageCardEl(t, coverage) {
  const card = cardShell(t, 'COVERAGE', coverage.refoldable ? 'all re-foldable' : null);
  const folded = el('div', 'display:flex;align-items:center;gap:8px');
  folded.appendChild(el('div', `font:600 10.5px ${UI};color:${t.mut};min-width:64px`, 'folded'));
  folded.appendChild(meter(coverage.foldedPct / 100, t, t.good));
  folded.appendChild(el('div', `font:700 10.5px ${MONO};color:${t.text}`, `${coverage.foldedPct}%`));
  card.appendChild(folded);
  const disc = el('div', 'display:flex;align-items:center;gap:8px');
  disc.appendChild(el('div', `font:600 10.5px ${UI};color:${t.mut};min-width:64px`, 'discarded'));
  disc.appendChild(meter(coverage.discardedPct / 100, t, t.faint));
  disc.appendChild(el('div', `font:700 10.5px ${MONO};color:${t.text}`, `${coverage.discardedPct}%`));
  card.appendChild(disc);
  card.appendChild(el('div', `font:600 10.5px ${MONO};color:${t.mut}`, `chrome ${coverage.buckets.chrome} · dup ${coverage.buckets.dup} · nul ${coverage.buckets.nul}`));
  return card;
}

function orbitCardEl(t, orbit, mountOrbit) {
  const card = cardShell(t, 'ORBIT', `${orbit.suns} sun · ${orbit.planets} planets · ${orbit.moons} moons`);
  // Let a host inject a live orbit view (the app's real solar map). It owns the
  // element from here; the built-in mini-SVG below is the fallback.
  if (typeof mountOrbit === 'function') {
    const host = el('div', 'width:100%;height:150px;border-radius:10px;overflow:hidden');
    card.appendChild(host);
    try { mountOrbit(host, orbit); return card; } catch (_) { host.remove(); }
  }
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 240 130');
  svg.setAttribute('style', 'width:100%;height:130px;display:block');
  const cx = 120, cy = 65;
  const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  const planets = orbit.nodes.filter((n) => n.kind === 'paradigm' || n.kind === 'planet');
  const moons = orbit.nodes.filter((n) => n.kind !== 'paradigm' && n.kind !== 'planet');
  const byParent = {};
  for (const m of moons) (byParent[m.parent] = byParent[m.parent] || []).push(m);
  svg.appendChild(mk('circle', { cx, cy, r: 9, fill: t.mut }));
  planets.forEach((p, i) => {
    const ang = (i / Math.max(1, planets.length)) * Math.PI * 2;
    const R = 42 + (i % 2) * 12;
    const px = cx + R * Math.cos(ang), py = cy + R * Math.sin(ang);
    svg.appendChild(mk('circle', { cx, cy, r: R, fill: 'none', stroke: t.border, 'stroke-width': 0.6 }));
    svg.appendChild(mk('circle', { cx: px, cy: py, r: 5, fill: p.color || t.accent }));
    (byParent[p.id] || []).forEach((m, j) => {
      const mang = ang + (j - 0.5) * 0.5;
      const mx = px + 11 * Math.cos(mang), my = py + 11 * Math.sin(mang);
      svg.appendChild(mk('circle', { cx: mx, cy: my, r: 1.8, fill: t.faint }));
    });
  });
  card.appendChild(svg);
  return card;
}

function readinessCardEl(t, readiness) {
  const card = cardShell(t, 'READINESS', readiness.summary);
  for (const ch of readiness.channels) {
    const row = el('div', 'display:flex;align-items:center;gap:8px');
    row.appendChild(el('div', `font:700 10.5px ${MONO};color:${t.text};min-width:74px`, ch.id));
    row.appendChild(el('div', `font:600 9.5px ${UI};color:${ch.thin ? t.warn : t.good};min-width:44px`, ch.thin ? 'THIN' : 'ready'));
    row.appendChild(meter(ch.level, t, ch.thin ? t.warn : t.good));
    card.appendChild(row);
  }
  if (readiness.surpriseWeightsProvisional) {
    card.appendChild(el('div', `font:500 10.5px ${UI};color:${t.warn}`, '⚠ surprise weights provisional'));
  }
  return card;
}

export function mountOverviewDashboard(root, model, opts = {}) {
  const t = opts.theme || THEMES.light;
  root.innerHTML = '';
  root.setAttribute('style', `background:${t.bg};color:${t.text};padding:16px;font-family:${UI};box-sizing:border-box;overflow-x:hidden`);
  const shell = el('div', 'max-width:960px;margin:0 auto;display:flex;flex-direction:column;gap:12px;min-width:0');
  shell.appendChild(storyHeader(t, model.story));
  shell.appendChild(frameCardEl(t, model.frame));
  shell.appendChild(divisionsCardEl(t, model.divisions));

  const grid = el('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;align-items:start;min-width:0');
  grid.appendChild(unitsCardEl(t, model.units));
  grid.appendChild(referentsCardEl(t, model.referents));
  grid.appendChild(recurrenceCardEl(t, model.recurrence));
  grid.appendChild(coverageCardEl(t, model.coverage));
  grid.appendChild(orbitCardEl(t, model.orbit, opts.mountOrbit));
  grid.appendChild(readinessCardEl(t, model.readiness));
  shell.appendChild(grid);

  root.appendChild(shell);
  return () => { root.innerHTML = ''; };
}

export default mountOverviewDashboard;
