const CARD_FRIENDLY_SHAPES = new Set(['article', 'dataset', 'code', 'service-page', 'forum']);
const PROSE_FIRST_SHAPES = new Set(['book', 'audio', 'poem', 'unknown']);

export const REGION_RENDERERS = Object.freeze({
  cardGrid: 'card-grid',
  prose: 'prose',
  collapsed: 'collapsed',
});

export function selectRegionRenderer(region, { sourceShape = 'unknown' } = {}) {
  if (!region) return REGION_RENDERERS.collapsed;
  if (isLowConfidenceSmallRegion(region)) return REGION_RENDERERS.collapsed;
  if (hasCardClearingMotif(region) && CARD_FRIENDLY_SHAPES.has(sourceShape)) return REGION_RENDERERS.cardGrid;
  if (hasSustainedReferents(region) || PROSE_FIRST_SHAPES.has(sourceShape)) return REGION_RENDERERS.prose;
  return REGION_RENDERERS.prose;
}

function hasCardClearingMotif(region) {
  const regularity = region.motifs?.regularity;
  const clearsNull = region.motifs?.clearsNull === true || region.motifs?.nullCleared === true || regularity?.clearsNull === true;
  const instances = region.motifs?.instances ?? region.motifInstances ?? 0;
  return clearsNull && instances >= 3;
}

function hasSustainedReferents(region) {
  const referents = region.referents || region.sustainedReferents || [];
  if (Array.isArray(referents)) return referents.length >= 2;
  return Number(referents.count || 0) >= 2;
}

function isLowConfidenceSmallRegion(region) {
  const confidence = region.confidence?.value ?? region.confidence;
  const size = region.size?.tokens ?? region.tokenCount ?? region.length ?? Infinity;
  return typeof confidence === 'number' && confidence < 0.35 && size <= 160;
}
