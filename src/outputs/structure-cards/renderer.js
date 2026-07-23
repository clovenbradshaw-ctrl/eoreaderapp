const VALID_STATUS = new Set(['candidate', 'accepted', 'held', 'superseded', 'gap']);

export function projectStructureCard(item) {
  if (!item?.hypothesisId) throw new TypeError('Structure card requires stable hypothesis identity');
  if (!VALID_STATUS.has(item.status)) throw new TypeError(`Unsupported hypothesis status: ${item.status}`);
  if (!item.anchor && item.memberCount == null) throw new TypeError('Structure card requires exact source anchor or member count');
  return Object.freeze({
    hypothesisId: item.hypothesisId,
    status: item.status,
    title: item.groundedLabel || item.neutralLabel || `Recurring kind ${item.hypothesisId}`,
    neutralReading: item.neutralReading,
    anchor: item.anchor,
    memberCount: item.memberCount,
    parameters: (item.parameters || []).map((p) => ({ id: p.id, role: p.role, unit: p.unit, observedRange: p.observedRange, evidence: p.evidence })),
    why: item.evidence || [],
    uncertainty: item.uncertainty || item.competingReading || null,
    actions: ['open-source', 'provenance'],
  });
}
