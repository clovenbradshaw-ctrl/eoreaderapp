export const STANCES = Object.freeze([
  Object.freeze({ id: 'clearing', mode: 'differentiating', object: 'condition', label: 'Clearing' }),
  Object.freeze({ id: 'dissecting', mode: 'differentiating', object: 'entity', label: 'Dissecting' }),
  Object.freeze({ id: 'unraveling', mode: 'differentiating', object: 'pattern', label: 'Unraveling' }),
  Object.freeze({ id: 'tending', mode: 'relating', object: 'condition', label: 'Tending' }),
  Object.freeze({ id: 'binding', mode: 'relating', object: 'entity', label: 'Binding' }),
  Object.freeze({ id: 'tracing', mode: 'relating', object: 'pattern', label: 'Tracing' }),
  Object.freeze({ id: 'cultivating', mode: 'generating', object: 'condition', label: 'Cultivating' }),
  Object.freeze({ id: 'making', mode: 'generating', object: 'entity', label: 'Making' }),
  Object.freeze({ id: 'composing', mode: 'generating', object: 'pattern', label: 'Composing' }),
]);

if (STANCES.length !== 9) {
  throw new Error('Canonical stance registry must contain 9 entries');
}

export function reportMissingStance(id) {
  throw new Error(`Missing canonical stance distribution entry: ${id}`);
}

export function validateStanceDistribution(distribution, { reportMissingStance: report = reportMissingStance } = {}) {
  const stances = distribution?.stances ?? distribution?.stance ?? distribution;
  for (const stance of STANCES) {
    const hasEntry = Array.isArray(stances)
      ? stances.some((entry) => (Array.isArray(entry) ? entry[0] : entry?.id) === stance.id)
      : Boolean(stances && Object.prototype.hasOwnProperty.call(stances, stance.id));
    if (!hasEntry) report(stance.id);
  }
  return true;
}

export function stanceRowsFromDistribution(distribution) {
  const stances = distribution?.stances ?? distribution?.stance ?? distribution;
  validateStanceDistribution(stances);
  return STANCES.map((stance) => {
    let pct = 0;
    if (Array.isArray(stances)) {
      const row = stances.find((entry) => (Array.isArray(entry) ? entry[0] : entry?.id) === stance.id);
      pct = Array.isArray(row) ? row[1] : row?.pct ?? row?.mass ?? 0;
    } else {
      pct = stances?.[stance.id] ?? 0;
    }
    return [stance.label, pct, stance];
  });
}
