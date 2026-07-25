// engine-loader.mjs — loads EOReader5 from GitHub via esm.sh and exposes
// window.EOReader5 with the runtime engine AND the entity kind induction
// pipeline (induceParameters → induceEntityKinds → buildKindVocabulary).
const ENGINE_URL = 'https://esm.sh/gh/clovenbradshaw-ctrl/eoreader5/packages/engine';

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
