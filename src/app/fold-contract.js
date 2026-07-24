const UI_ARTIFACT_LABELS = new Set(['here', 'view', 'dec', 'new', 'listen', 'toggle caption', 'download']);

export function foldVersion(sourceFold) {
  return sourceFold && sourceFold.version ? sourceFold.version : 'unfolded';
}

export function hasEvidence(object) {
  return !!(object && Array.isArray(object.evidence) && object.evidence.length > 0);
}

export function displayableReferents(sourceFold) {
  return ((sourceFold && sourceFold.referents) || []).filter((ref) => {
    const label = String(ref.canonicalLabel || ref.name || '').trim();
    const normalized = label.toLowerCase();
    if (!label || UI_ARTIFACT_LABELS.has(normalized)) return false;
    if (normalized === 'house' && (ref.surfaceForms || []).some((form) => /white house/i.test(form))) return false;
    return hasEvidence(ref) && ref.aliasesResolved !== false;
  });
}

export function sourceSearchIndex(sourceFold) {
  const version = foldVersion(sourceFold);
  return ((sourceFold && sourceFold.normalizedPassages) || []).map((passage, index) => ({
    id: passage.id || `passage-${index + 1}`,
    sourceId: sourceFold.sourceId,
    foldVersion: version,
    text: String(passage.text || passage.body || ''),
  }));
}

export function workspaceSearchIndex(workspaceFold, sourceFoldsByVersion) {
  const versions = new Set((workspaceFold && workspaceFold.activeSourceFoldVersions) || []);
  return Array.from(versions).flatMap((version) => sourceSearchIndex(sourceFoldsByVersion[version] || null));
}

export function searchFold(index, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return { status: 'guidance', label: 'Choose a source or workspace scope, then search for evidence.', results: [] };
  const terms = q.split(/\s+/).filter(Boolean);
  const results = index.filter((item) => terms.every((term) => item.text.toLowerCase().includes(term)));
  return {
    status: results.length ? 'found' : 'none',
    label: results.length ? 'Evidence found' : 'No evidence found in this scope',
    results,
  };
}

export function workspaceEvidenceBase(workspaceFold, sourceFoldsByVersion) {
  const active = (workspaceFold && workspaceFold.activeSourceFoldVersions) || [];
  return {
    sourceCount: active.length,
    versions: active.slice(),
    passageCount: workspaceSearchIndex(workspaceFold, sourceFoldsByVersion).length,
  };
}
