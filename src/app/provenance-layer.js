const FRAME_KIND = 'apparatus';
const CAST_RENDERING = Object.freeze({ layer: 'cast', shape: 'filled-disc', radius: 'mass' });
const FRAME_RENDERING = Object.freeze({ layer: 'provenance', shape: 'outlined-ring', radius: 'fixed', position: 'outer-annulus' });

export function isProvenanceReferent(referent) {
  return referent?.individuation_type === FRAME_KIND || referent?.kind === FRAME_KIND;
}

export function renderingForReferent(referent) {
  if (isProvenanceReferent(referent)) return FRAME_RENDERING;
  return CAST_RENDERING;
}

export function orbitBodiesForReading(snapshot = {}) {
  const referents = snapshot.referents || snapshot.fold?.referents || [];
  const provenanceIds = new Set((snapshot.provenance_layer?.referents || []).map((item) => item.id || item.referent_id));
  const ring = [];
  const planets = [];
  for (const referent of referents) {
    const inFrame = provenanceIds.has(referent.id) || isProvenanceReferent(referent);
    if (inFrame) ring.push(Object.freeze({ ...referent, visual: FRAME_RENDERING, action: 'open-provenance' }));
    else planets.push(Object.freeze({ ...referent, visual: CAST_RENDERING }));
  }
  return Object.freeze({ planets: Object.freeze(planets), provenanceRing: Object.freeze(ring) });
}

export function activeHereReferents(text, referents, entitiesIn) {
  const present = entitiesIn(text, referents);
  return Object.freeze(present.filter((referent) => {
    if (!isProvenanceReferent(referent)) return true;
    return referent.predicate_class === 'non-attributive';
  }));
}

export function provenancePanelModel(snapshot = {}) {
  const referents = snapshot.referents || snapshot.fold?.referents || [];
  const byId = new Map(referents.map((referent) => [referent.id, referent]));
  const layerItems = snapshot.provenance_layer?.referents || [];
  const frameItems = layerItems.length ? layerItems : referents.filter(isProvenanceReferent);
  return Object.freeze(frameItems.map((item) => {
    const referent = byId.get(item.id || item.referent_id) || item;
    const carried = item.carries || item.tethered_referents || referent.carries || [];
    const prior = item.prior_snapshot || referent.prior_snapshot || snapshot.prior_snapshot || null;
    return Object.freeze({
      id: referent.id || item.id,
      label: referent.name || item.name || 'Source frame',
      sublabel: referent.display_word || item.display_word || 'Source frame',
      reason: referent.gate_result?.reason || item.gate_result?.reason || '',
      carries: Object.freeze(carried),
      stats: Object.freeze({ carries: carried.length, mentions: referent.count || referent.mentions || 0, flags: referent.flags || 0 }),
      priorIdentity: prior ? (prior.identity || prior.id || null) : null,
      priorPocketVersion: prior ? (prior.pocket_version || prior.pocketVersion || null) : null,
      archiveStatus: item.archive_status || referent.archive_status || snapshot.archive_status || null,
      action: 'open-provenance',
    });
  }));
}

export function frameAsSubjectLensPatch(enabled) {
  return Object.freeze({ read_frame_as_subject: Boolean(enabled) });
}
