// Build-time engine adapter selection manifest.
//
// The app integrates EOReader engines only through src/engine/adapter.js.
// This manifest names public package entry points and compatibility routes; it
// must not contain deep paths into vendored engine assets.
export const ENGINE_SELECTION = Object.freeze({
  adapter: 'eoreader5',
  enginePackage: '@eoreader/engine',
  specPackage: '@eoreader/spec',
  compatPackage: '@eoreader/compat-4.2',
  legacyRoute: './src/legacy/legacy-42-route.js',
});

export default ENGINE_SELECTION;
