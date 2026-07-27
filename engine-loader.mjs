// engine-loader.mjs — loads EOReader5 from GitHub via esm.sh and exposes
// window.EOReader5 with the runtime engine AND the entity kind induction
// pipeline (induceParameters → induceEntityKinds → buildKindVocabulary).
//
// Pinned to a specific eoreader5 commit (rather than the unpinned default
// branch) so upgrades are deliberate and esm.sh's CDN cache can't leave the
// app silently stuck on a stale build. Bump ENGINE_COMMIT to pick up new
// engine improvements (see eoreader5's commit history for parsing fixes).
const ENGINE_COMMIT = '56a5dea06577b60d2b11a90af996a414fb6d2b19';
const ENGINE_URL = `https://esm.sh/gh/clovenbradshaw-ctrl/eoreader5@${ENGINE_COMMIT}/packages/engine`;

async function loadEngine() {
  try {
    const mod = await import(ENGINE_URL);
    const engine = mod.createEOReaderEngine({ protocolVersion: 1 });
    window.EOReader5 = {
      // Runtime engine
      read: (input, opts) => engine.read(input, opts),
      parse: (input, opts) => engine.read(input, opts),
      createEOReaderEngine: mod.createEOReaderEngine,
      // Entity kind induction pipeline (operator chain: SIG→CON→EVA→DEF→INS→SYN)
      induceParameters: mod.induceParameters,
      parameterProfiles: mod.parameterProfiles,
      profileJaccard: mod.profileJaccard,
      induceEntityKinds: mod.induceEntityKinds,
      buildKindVocabulary: mod.buildKindVocabulary,
    };
    console.log('[engine-loader] EOReader5 engine + entity kind pipeline loaded from GitHub');
    window.dispatchEvent(new CustomEvent('eo5:ready'));
  } catch (err) {
    console.error('[engine-loader] Failed to load EOReader5:', err);
  }
}

loadEngine();
