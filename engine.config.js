// Single source of truth for which engine this app boots.
// To swap engines (e.g. eoreader4.2 -> eoreader5):
//   1. git submodule add <repo-url> engine/<name>
//   2. change ENGINE_DIR below to "engine/<name>"
//   3. confirm the new engine still exposes vendor/, support.js and
//      src/rooms/reader/boot.js (or update the paths below to match it)
// Nothing else in this app should hardcode an engine path.
export const ENGINE_DIR = 'engine/eoreader4.2';

export const ENGINE_ASSETS = {
  vendorReact: `${ENGINE_DIR}/vendor/react.production.min.js`,
  vendorReactDom: `${ENGINE_DIR}/vendor/react-dom.production.min.js`,
  vendorOlm: `${ENGINE_DIR}/vendor/olm/olm.js`,
  support: `${ENGINE_DIR}/support.js`,
  boot: `${ENGINE_DIR}/src/rooms/reader/boot.js`,
};
