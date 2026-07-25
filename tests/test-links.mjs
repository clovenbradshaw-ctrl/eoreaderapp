// Quick standalone test: run the app's analyzeText logic on Frankenstein
// and show the creature entity's links with derived relation verbs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read Frankenstein text
const text = readFileSync(
  resolve(__dirname, '../../eoreader4.2/tests/fixtures/frankenstein.txt'),
  'utf8'
);

// ---- Replicate analyzeText logic (index.html ~3202-3372) ----
const raw = text.replace(/\r/g,'').slice(0,3000000);
let paras = raw.split(/\n{2,}/).map(s=>s.trim()).filter(Boolean);
if (paras.length < 2) paras = raw.split(/\n/).map(s=>s.trim()).filter(Boolean);
paras = paras.slice(0,6000);
const whole = paras.join('\n\n');

const stop = new Set('The A An And But Or Nor For In On At To Of With From By As Is Are Was Were Be This That These Those It He She They We You I If Then So When While Where What Who Which How Why Not No Yes Mr Mrs Ms Dr Prof Senator President Ministry Department Office Committee Company Inc Corp LLC Ltd University Institute Foundation Report Memo Chapter Book Part Volume Act Scene Canto Epilogue Prologue Section Introduction Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December'.split(' '));
const suffix = /\b(Inc|Corp|Corporation|Company|Co|LLC|Ltd|Limited|University|Institute|Foundation|Ministry|Department|Agency|Committee|Council|Bank|Labs|Systems|Technologies|Group|Holdings)\.?$/;

const midCap = {};
const cap = /\b([A-Z](?:[a-zA-Z0-9&'’-]|\.(?=[A-Za-z0-9]))*(?:\s+(?:(?:of|the|de|du|van|von)(?=\s)|[A-Z](?:[a-zA-Z0-9&'’-]|\.(?=[A-Za-z0-9]))*)){0,5})/g;
let m;
while ((m = cap.exec(whole))) {
  const key = m[1].toLowerCase();
  if (key.length < 2) continue;
  midCap[key] = true;
}

const lc = {};
let lm;
const lre = /\b[a-z][a-z'’]{1,}\b/g;
while ((lm = lre.exec(whole))) { lc[lm[0]] = (lc[lm[0]] || 0) + 1; }

const funcFloor = new Set([...stop].map(s => s.toLowerCase()));
const isProper = (tok) => tok.length >= 2 && !funcFloor.has(tok) && (lc[tok] || 0) < 2;

const freq = {};
const surfaces = {};
function add(name) {
  const key = name.toLowerCase().trim();
  if (!key || key.length < 2) return null;
  freq[key] = (freq[key] || 0) + 1;
  surfaces[key] = name;
  return key;
}

// Token extraction
const entSrc = whole;
const emails = whole.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) || [];
emails.forEach(x => add(x));
const urls = whole.match(/https?:\/\/[^\s)]+/gi) || [];
urls.forEach(x => { try { add(new URL(x).host.replace(/^www\./, '')); } catch (_) {} });

// Find capitalized candidates
const cap2 = /\b([A-Z][a-zA-Z0-9&'’-]+(?:\s+(?:[A-Z][a-zA-Z0-9&'’-]+|of|the|de|du|van|von)){0,4})\b/g;
let cm;
while ((cm = cap2.exec(whole))) {
  const name = cm[1].trim();
  const key = name.toLowerCase();
  if (key.length < 2) continue;
  freq[key] = (freq[key] || 0) + 1;
  surfaces[key] = name;
}

let ents = Object.keys(freq).map(k => ({ key: k, name: surfaces[k], count: freq[k] })).filter(e => {
  if (/^\d+$/.test(e.name)) return false;
  const hasField = /@|\.|\d/.test(e.name) || suffix.test(e.name);
  if (!hasField) {
    const toks = e.key.split(' ');
    if (toks.length === 1) { if (!isProper(toks[0]) || !midCap[e.key]) return false; }
    else if (toks.every(t => funcFloor.has(t)) || !toks.some(isProper)) return false;
  }
  return e.count >= 2 || e.name.includes(' ') || hasField;
}).sort((a, b) => b.count - a.count || b.name.length - a.name.length);

// ── Unnamed referent detection + folding ──
const DESC_SKIP=new Set(['could','would','should','might','must','shall','will','may','every','some','any','no','each','both','few','most','all','such','same','own','very','just','only','not','now','there','then','than','too','also','still','even','yet','already','about','across','along','around','behind','below','beneath','beside','beyond','inside','outside','toward','within','without','onto','into','upon','throughout','during','before','after','between','under','above','again','further','once','when','where','why','how','what','which','who','whom','whose','this','that','these','those','being','having','doing','going','coming','making','taking','giving','getting','letting','keeping','looking','finding','asking','trying','telling','showing','calling','using','starting','turning','running','living','working','playing','moving','thinking','feeling','knowing','seeing','hearing','saying','watching','standing','sitting','walking','talking','eating','drinking','reading','writing','buying','selling','paying','speaking','holding','bringing','beginning','stopping','continuing','following','remaining','changing','growing','developing','becoming','seeming','appearing','mattering','existing','happening','occurring','passing','following','leading']);
const DESC_VERBS=new Set('was were is are am been being had has have said says told tells did does made makes took takes gave gives came comes went goes saw sees knew knows found finds looked looks called calls began begins became becomes felt feels thought thinks let lets kept keeps tried tries turned turns ran runs lived lives worked works spoke speaks wrote writes heard hears watched watches stood stands sat sits walked walks asked asks answered replies cried cries exclaimed replied continued added observed repeated interrupted returned remarked resumed spoke spoke'.split(' '));
const DESC_PRONOUNS=new Set('he him his she her hers it its they them their himself herself itself'.split(' '));
const DESC_HEAD=/[Tt]he\s+(?:(?:[a-z]{3,}\s+)*)([a-z]{3,})/g;
const descMeta={};
for(let pi=0;pi<paras.length;pi++){ const sents=paras[pi].split(/(?<=[.!?])\s+/);
  for(let si=0;si<sents.length;si++){ const s=sents[si].toLowerCase(); DESC_HEAD.lastIndex=0; let dm;
    while((dm=DESC_HEAD.exec(s))){ const h=dm[1]; if(funcFloor.has(h)||DESC_SKIP.has(h)||h.length<4||h.endsWith('ing')||h.endsWith('ed')||h.endsWith('ly')||h==='said'||h==='being'||h==='having'||h==='doing'||(lc[h]||0)<4) continue;
      if(!descMeta[h]) descMeta[h]={count:0,subj:[],speech:[],anim:[]};
      descMeta[h].count++; const idx=pi*1000+si;
      const after=s.slice(dm.index+dm[0].length).match(/^\s+([a-z]+)/);
      if(after&&(DESC_VERBS.has(after[1])||after[1].endsWith('ed')||after[1].endsWith('ing'))) descMeta[h].subj.push(idx);
      if(after&&after[1]&&['said','says','told','tells','asked','asks','answered','replies','replied','cried','cries','exclaimed','repeated','remarked','resumed','continued','added','observed','whispered','shouted','began','begun'].includes(after[1])) descMeta[h].speech.push(idx);
      const nextS=si+1<sents.length?sents[si+1].toLowerCase():'';
      for(const pn of DESC_PRONOUNS){ if(s.indexOf(pn)>=0||nextS.indexOf(pn)>=0){ descMeta[h].anim.push(idx); break; } }
    }
  }
}
const descMass=Math.max(3,Math.round(Math.sqrt(paras.length)*0.2));
const foldedHeads=new Set();
for(const a of Object.keys(descMeta).filter(h=>descMeta[h].count>=descMass&&descMeta[h].subj.length>=2)){
  if(foldedHeads.has(a)) continue;
  const ma=descMeta[a]; const merged=[a]; const aSubjSet=new Set(ma.subj);
  for(const b of Object.keys(descMeta).filter(h=>!foldedHeads.has(h)&&h!==a&&descMeta[h].count>=descMass&&descMeta[h].subj.length>=2)){
    let coact=false; for(const ss of descMeta[b].subj){ if(aSubjSet.has(ss)){ coact=true; break; } }
    if(coact) continue;
    if(descMeta[b].speech.length<1||ma.speech.length<1) continue;
    if(descMeta[b].anim.length<1||ma.anim.length<1) continue;
    foldedHeads.add(b); merged.push(b); ma.count+=descMeta[b].count;
    for(const ss of descMeta[b].subj) ma.subj.push(ss);
  }
  ma.merged=merged;
}
const seenNames=new Set(ents.map(e=>e.name.toLowerCase()));
const creaturePref=['creature','monster','fiend','wretch','daemon','being','apparition'];
for(const h of Object.keys(descMeta)){
  if(foldedHeads.has(h)||descMeta[h].count<descMass||descMeta[h].subj.length<2) continue;
  const mm=descMeta[h];
  let canon=h; for(const p of creaturePref){ if((mm.merged||[h]).includes(p)){ canon=p; break; } }
  const phrase='the '+canon; const key=phrase.toLowerCase();
  if(!seenNames.has(key)&&!seenNames.has(h)){ ents.push({key,name:phrase,count:mm.count}); seenNames.add(key); }
}

const pal = ['#c0662e','#4f6bed','#8e6fb3','#2f8f6b','#c0392b','#2a78d6','#b0842f','#c77dba'];
const entById = {}, list = [];
ents.slice(0, 240).forEach((e, i) => {
  const id = 'e' + i, color = pal[i % pal.length], ctx = [];
  const er = new RegExp('(^|\\b)' + e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\b|$)', 'i');
  for (const p of paras) {
    if (ctx.length >= 30) break;
    if (!er.test(p)) continue;
    const ss = p.split(/(?<=[.?!])\s+/);
    for (const s of ss) {
      if (ctx.length >= 30) break;
      if (er.test(s)) { const c = s.replace(/\s+/g, ' ').trim(); if (c) ctx.push(c); }
    }
  }
  const o = { id, name: e.name, color, count: e.count, links: 0, conns: [], related: [], ctx };
  entById[id] = o;
  list.push(o);
});

// ---- Co-occurrence (with our changes) ----
function deriveRelVerb(aName, bName, ctx) {
  if (!ctx) return 'MENTIONS';
  const lc = ctx.toLowerCase();
  const patterns = [
    [/\b(contradicts?|disagrees?|disputed?|denied|rejected?|refuted?|against|opposed?|differs?|inconsistent|contrasts)\b/, 'CONTRADICTS'],
    [/\b(according to|said|tells?|told|spoke|says|quoted?|reported\s+(that|in)|in\s+(a|an)\s+(interview|statement|report))\b/, 'QUOTED'],
    [/\b(sponsored?|funded?|backed?|financed?|invested?|paid\s+(for|by)|funding\s+(from|by)|grant\s+(from|to))\b/, 'SPONSORED'],
    [/\b(issued|released?|published|announced?|unveiled|launched|put\s+out|rolled\s+out)\b/, 'ISSUED'],
    [/\b(administers?|manages?|oversees?|runs?|directs?|operates?|led|leads?|heading?|headed)\b/, 'ADMINISTERS'],
    [/\b(predicted?|forecast|projected?|estimated?|expected?|anticipated?|forecasted)\b/, 'PREDICTED'],
    [/\b(cited?|referenced?|references?|as\s+noted\s+(by|in)|according\s+to)\b/, 'CITED'],
    [/\b(located?|based\s+(in|at|on)|site|headquarters?|headquartered|offices?\s+(in|at)|operates?\s+(in|from))\b/, 'SITE OF'],
    [/\b(appointed?|hired?|elected?|named|nominated|selected\s+(as|to)|chosen\s+as)\b/, 'APPOINTED'],
    [/\b(supported?|advocated?|endorsed?|backed?|approved?|championed?|argued\s+for|pushed\s+for|defended|stood\s+by)\b/, 'SUPPORTS'],
    [/\b(criticized?|attacked?|blamed?|accused?|opposed?|fought|warned\s+(about|against)|raised\s+concerns|cautioned)\b/, 'OPPOSES'],
    [/\b(wrote|authored?|drafted?|co-authored?|co-wrote|co-written|co-wrote)\b/, 'AUTHORED'],
    [/\b(investigated?|probed?|examined?|reviewed?|studied?|looked\s+into|inquired?|audited?)\b/, 'INVESTIGATED'],
    [/\b(represents?|representing|acted\s+(for|on\s+behalf)|spokesperson|spokesman|spokeswoman)\b/, 'REPRESENTS'],
    [/\b(joined|worked\s+(at|for|with)|employed\s+(by|at)|staff|member\s+of)\b/, 'AFFILIATED'],
    [/\b(met\s+(with|at)|discussed|talked\s+(to|with|about)|negotiated|partnered|collaborated|conferred)\b/, 'ENGAGED'],
  ];
  for (const [re, verb] of patterns) {
    if (re.test(lc)) return verb;
  }
  return 'MENTIONS';
}

const top = list;
top.forEach(e => e._co = {});
paras.forEach(p => {
  const here = top.filter(e => p.toLowerCase().indexOf(e.name.toLowerCase()) >= 0);
  for (let x = 0; x < here.length; x++) {
    for (let y = 0; y < here.length; y++) {
      if (x !== y) {
        here[x]._co[here[y].id] = (here[x]._co[here[y].id] || 0) + 1;
        if (!here[x]._coCtx) here[x]._coCtx = {};
        if (!here[x]._coCtx[here[y].id]) here[x]._coCtx[here[y].id] = p;
      }
    }
  }
});
top.forEach(e => {
  const r = Object.keys(e._co).sort((a, b) => e._co[b] - e._co[a]);
  e.links = r.length;
  e.conns = r.slice(0, 5).map(id => ({
    v: deriveRelVerb(e.name, entById[id].name, e._coCtx && e._coCtx[id]),
    c: entById[id].color,
    t: entById[id].name,
    id,
    count: e._co[id]
  }));
  e.related = r.slice(0, 3).map(id => ({ n: entById[id].name, c: entById[id].color, id }));
  delete e._co;
  delete e._coCtx;
});

// (no referent merging — epithets like "creature"/"monster"/"fiend" are separate entities)

// ---- Find the creature entity (via unnamed referent detection) ----
let creature = list.find(e => e.name.toLowerCase() === 'the creature');

console.log(`\n=== "${creature ? 'the creature' : '(not found)'}" Entity Card ===`);
console.log(`Mentions: ${creature ? creature.count : '—'}`);
console.log(`Links:    ${creature ? creature.links : '—'}`);
const creatureIdx = creature ? list.indexOf(creature) : -1;
console.log(`Creature rank in list: ${creatureIdx + 1}/${list.length}`);
if (creature && creature.conns.length) {
  console.log(`\n━━━ Connections ───────────────────────`);
  console.log(`  ${'Entity'.padEnd(28)} ${'Relation'.padEnd(12)} ×`);
  console.log(`  ${'─'.repeat(48)}`);
  creature.conns.forEach(c => {
    console.log(`  ${c.t.padEnd(30)} ${c.v.padEnd(12)} ${c.count}`);
  });
  const top = creature.conns[0];
  const sharedPara = paras.find(p => {
    const l = p.toLowerCase();
    return l.indexOf(creature.name.toLowerCase()) >= 0 && l.indexOf(top.t.toLowerCase()) >= 0;
  });
  if (sharedPara) {
    const snippet = sharedPara.length > 120 ? sharedPara.slice(0, 120) + '…' : sharedPara;
    console.log(`\n  Shared context sample: "${snippet.replace(/\n/g,' ')}"`);
  }
} else if (creature && creatureIdx >= topN) {
} else {
  console.log(`\n  (not detected)`);
}

console.log(`\n━━━ Verb derivation examples (real characters + creature) ───────`);
  const real = ['Victor','Frankenstein','the creature','Elizabeth','Clerval','Henry','Justine','William','Felix','Agatha','Safie','Ernest','Waldman','Krempe'];
  list.filter(e => e.links > 0 && real.includes(e.name)).sort((a, b) => b.links - a.links).slice(0, 12).forEach(e => {
    const top3 = e.conns.slice(0, 4).map(c => `${c.t}(${c.v}:${c.count})`).join(', ');
    console.log(`  ${e.name.padEnd(16)} ×${e.links.toString().padStart(2)}  ${top3}`);
  });
  
  console.log(`\n━━━ Verb origin examples (shared context snippets) ───────`);
  const pairs = [
    ['Victor', 'Elizabeth'],
    ['Justine', 'William'],
    ['the creature', 'Victor'],
    ['the creature', 'Frankenstein'],
    ['Turk', 'Felix'],
    ['Felix', 'Agatha'],
    ['Safie', 'Felix'],
  ];
  for (const [a, b] of pairs) {
    const eA = list.find(e => e.name === a);
    if (!eA) continue;
    const conn = eA.conns.find(c => c.t === b);
    if (!conn) continue;
    // Find actual context that triggered it
    const sharedPara = paras.find(p => {
      const lc = p.toLowerCase();
      return lc.indexOf(a.toLowerCase()) >= 0 && lc.indexOf(b.toLowerCase()) >= 0;
    });
    if (sharedPara) {
      const snippet = sharedPara.length > 120 ? sharedPara.slice(0, 120) + '…' : sharedPara;
      console.log(`  ${a.padEnd(14)} → ${b.padEnd(14)} [${conn.v}: ×${conn.count}] "${snippet.replace(/\n/g, ' ')}"`);
    }
  }

