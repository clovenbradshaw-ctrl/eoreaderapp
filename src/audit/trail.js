import { EOT_OPERATOR_DEFINITIONS } from '../app/eot-grammar.js';
import { sessionAudit } from './session-audit.js';

const OPERATOR_BY_SYMBOL = new Map(EOT_OPERATOR_DEFINITIONS.map((op) => [op.symbol, op]));

// A surface is anything an OutputOrgan rendered: a referent, a claim, a connection
// edge, a card, a region. Any of these can carry a `derivation.steps` trace of
// operator applications and a `gate_result` describing what licensed it to appear.
export function operatorStepsForSurface(surface) {
  const steps = surface?.derivation?.steps || surface?.trace?.steps || [];
  return Object.freeze(steps.map((step) => {
    const op = OPERATOR_BY_SYMBOL.get(step.operator);
    if (!op) throw new TypeError(`Unknown operator in trace: ${step.operator}`);
    return Object.freeze({
      operator: step.operator,
      name: op.name,
      signature: op.signature,
      input: Object.freeze((step.input || []).slice()),
      output: step.output ?? null,
    });
  }));
}

// Priors consulted for a surface. The engine has not yet published a
// `gate_result.priors_consulted` contract, so this normalizes whichever of the
// two shapes are present today: an explicit per-activation list (preferred,
// once the engine emits one) or the single pinned prior identity already
// carried on referents/snapshots (see src/app/provenance-layer.js). Returns an
// empty list — not a guess — when neither is present, so "no priors were
// consulted" is a representable, honest answer.
export function priorActivationsForSurface(surface, priorSnapshot = null) {
  const consulted = surface?.gate_result?.priors_consulted || surface?.priors_consulted;
  if (Array.isArray(consulted)) {
    return Object.freeze(consulted.map((p) => Object.freeze({
      pocketId: p.pocket_id || p.pocketId || null,
      channel: p.channel || null,
      weight: p.weight ?? p.mass ?? null,
    })));
  }
  const pinned = surface?.prior_snapshot || priorSnapshot;
  if (!pinned) return Object.freeze([]);
  return Object.freeze([Object.freeze({
    pocketId: pinned.identity || pinned.id || null,
    channel: null,
    weight: null,
    pocketVersion: pinned.pocket_version || pinned.pocketVersion || null,
  })]);
}

export function evidenceAnchorsForSurface(surface) {
  const direct = surface?.provenance?.anchors || surface?.anchors;
  if (Array.isArray(direct)) return Object.freeze(direct.slice());
  const fromEvidence = (surface?.evidence || []).map((item) => item.anchor).filter(Boolean);
  return Object.freeze(fromEvidence);
}

// The full "what was it doing to get that" trace for one surface: the
// operators applied, the priors consulted (possibly none), the exact anchors
// it rests on, the gate's own stated reason, and the session identity
// (engine, operator epoch, pinned prior snapshot, source/observation hashes)
// it was produced under.
export function surfaceAuditTrail(surface, { sessionRecord, priorSnapshot } = {}) {
  if (!surface?.id) throw new TypeError('Auditable surface requires an id');
  return Object.freeze({
    surfaceId: surface.id,
    label: surface.name || surface.canonicalLabel || surface.id,
    reason: surface.gate_result?.reason || null,
    operators: operatorStepsForSurface(surface),
    priorsActivated: priorActivationsForSurface(surface, priorSnapshot),
    evidenceAnchors: evidenceAnchorsForSurface(surface),
    session: sessionRecord ? sessionAudit(sessionRecord) : null,
  });
}

export function surfaceAuditTrails(surfaces, options = {}) {
  return Object.freeze((surfaces || []).map((surface) => surfaceAuditTrail(surface, options)));
}

// The app's local entity finder (see eoreader_app.html `entitiesIn`) runs
// ahead of any EOReader5 engine connection: it matches surface forms with
// regex, not the nine EOT operators, and no PriorSnapshot is pinned locally.
// Fabricating an operator/prior trace for its output would misrepresent what
// actually happened, so this is the honest audit trail for that mode: no
// operators, no priors, just the exact evidence anchors the match rests on.
export function localHeuristicAuditTrail(entity) {
  if (!entity?.id) throw new TypeError('Auditable entity requires an id');
  return Object.freeze({
    surfaceId: entity.id,
    label: entity.name || entity.id,
    mechanism: 'local-heuristic-finder',
    operators: Object.freeze([]),
    priorsActivated: Object.freeze([]),
    evidenceAnchors: Object.freeze((entity.ctx || []).slice()),
    note: 'Found by the local heuristic entity finder (regex surface-form match) — no live EOT operator trace or PriorSnapshot ran for this mention. Every anchor above is exact evidence in the source text; nothing here was generated.',
  });
}
