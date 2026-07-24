const GENERIC_VOCABULARY = Object.freeze({
  Paradigm: 'the whole thing',
  Lens: 'sections',
  Kind: 'patterns',
  Entity: 'things mentioned',
  Field: 'context',
  Void: 'unread',
});

const SOURCE_VOCABULARY = Object.freeze({
  article: Object.freeze({
    Paradigm: 'the piece',
    Lens: 'the angle',
    Kind: 'theme',
    Entity: 'who/what',
    Field: 'context',
    Void: 'unread',
  }),
  book: Object.freeze({
    Paradigm: 'the work',
    Lens: 'the reading',
    Kind: 'motif',
    Entity: 'character',
    Field: 'setting',
    Void: 'unread',
  }),
  code: Object.freeze({
    Paradigm: 'the system',
    Lens: 'the interface',
    Kind: 'pattern',
    Entity: 'module',
    Field: 'scope',
    Void: 'untouched',
  }),
  dataset: Object.freeze({
    Paradigm: 'the study',
    Lens: 'the framing',
    Kind: 'variable',
    Entity: 'field',
    Field: 'population',
    Void: 'missing',
  }),
  audio: Object.freeze({
    Paradigm: 'the recording',
    Lens: 'the mix',
    Kind: 'motif',
    Entity: 'voice/instrument',
    Field: 'room tone',
    Void: 'silence',
  }),
});

export function vocabularyForSourceShape(sourceShape) {
  return SOURCE_VOCABULARY[sourceShape] || GENERIC_VOCABULARY;
}

export function readerLabel(terrainId, sourceShape) {
  return vocabularyForSourceShape(sourceShape)[terrainId] || GENERIC_VOCABULARY[terrainId] || 'section';
}

export function progressiveDisclosureLabels(sourceShape) {
  const words = vocabularyForSourceShape(sourceShape);
  return Object.freeze([words.Paradigm, words.Lens, words.Kind, words.Entity, words.Field, words.Void]);
}

export const appVocabulary = Object.freeze({
  generic: GENERIC_VOCABULARY,
  bySourceShape: SOURCE_VOCABULARY,
});
