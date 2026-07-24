export const READING_MODES = Object.freeze({
  read: 'Read',
  skim: 'Skim',
  study: 'Study',
  cards: 'Cards',
});

export const LAYERS = Object.freeze({
  entityMarks: 'entity-marks',
  surpriseGutter: 'surprise-gutter',
  strainSpine: 'strain-spine',
  discardVeil: 'discard-veil',
  motifFrame: 'motif-frame',
  disagreementFlags: 'disagreement-flags',
  coverage: 'coverage',
});

export const LAYER_BINDINGS = Object.freeze({
  [LAYERS.entityMarks]: Object.freeze({ source: 'referents', default: true }),
  [LAYERS.surpriseGutter]: Object.freeze({ source: 'signals.surprise.doc', default: true, analogue: true }),
  [LAYERS.strainSpine]: Object.freeze({ source: 'signals.strain', default: true }),
  [LAYERS.discardVeil]: Object.freeze({ source: 'discards', default: false }),
  [LAYERS.motifFrame]: Object.freeze({ source: 'motifs', default: 'auto' }),
  [LAYERS.disagreementFlags]: Object.freeze({ source: 'signals.disagreement', default: false, studyOnly: true }),
  [LAYERS.coverage]: Object.freeze({ source: 'regions', default: false }),
});

export const MODE_LAYER_DEFAULTS = Object.freeze({
  Read: Object.freeze({
    [LAYERS.entityMarks]: true,
    [LAYERS.surpriseGutter]: false,
    [LAYERS.strainSpine]: false,
    [LAYERS.discardVeil]: false,
    [LAYERS.motifFrame]: false,
    [LAYERS.disagreementFlags]: false,
    [LAYERS.coverage]: false,
  }),
  Skim: Object.freeze({
    [LAYERS.entityMarks]: true,
    [LAYERS.surpriseGutter]: false,
    [LAYERS.strainSpine]: true,
    [LAYERS.discardVeil]: false,
    [LAYERS.motifFrame]: false,
    [LAYERS.disagreementFlags]: false,
    [LAYERS.coverage]: false,
  }),
  Study: Object.freeze({
    [LAYERS.entityMarks]: true,
    [LAYERS.surpriseGutter]: true,
    [LAYERS.strainSpine]: true,
    [LAYERS.discardVeil]: true,
    [LAYERS.motifFrame]: true,
    [LAYERS.disagreementFlags]: true,
    [LAYERS.coverage]: true,
  }),
  Cards: Object.freeze({
    [LAYERS.entityMarks]: false,
    [LAYERS.surpriseGutter]: false,
    [LAYERS.strainSpine]: false,
    [LAYERS.discardVeil]: false,
    [LAYERS.motifFrame]: true,
    [LAYERS.disagreementFlags]: false,
    [LAYERS.coverage]: false,
  }),
});

export function intentForMode(mode, baseIntent = {}) {
  const normalized = READING_MODES[String(mode || '').toLowerCase()];
  if (!normalized) throw new TypeError(`Unsupported reading mode: ${mode}`);
  return Object.freeze({ ...baseIntent, mode: normalized });
}

export function layerDefaultsForMode(mode) {
  return MODE_LAYER_DEFAULTS[mode] || MODE_LAYER_DEFAULTS.Read;
}
