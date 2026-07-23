export function createLegacy42Envelope({ sourceHash, transferNotes }) {
  return Object.freeze({
    schema: 'Legacy42Envelope@1',
    sourceHash,
    transferNotes: transferNotes || [],
    route: '../legacy/legacy-42-route.js',
  });
}
