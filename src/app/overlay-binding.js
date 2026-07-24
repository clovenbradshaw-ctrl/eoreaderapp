const GATE_CLEARED_REFERENT_KINDS = new Set(['holon', 'protogon']);

export function bindEntityMarks(fold, resolveAnchor) {
  const marks = [];
  let unbound = 0;
  for (const referent of fold?.referents || []) {
    if (!GATE_CLEARED_REFERENT_KINDS.has(referent.kind)) continue;
    const anchors = referent.provenance?.anchors || referent.anchors || [];
    for (const anchor of anchors) {
      const range = resolveAnchor(anchor);
      if (!range || range.collapsed) {
        unbound += 1;
        continue;
      }
      marks.push(Object.freeze({ referentId: referent.id, kind: referent.kind, range }));
    }
  }
  return Object.freeze({ marks, unbound });
}

export function scheduleOverlayResolution(callback, { win = globalThis.window } = {}) {
  const raf = win?.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
  raf(() => raf(callback));
}
