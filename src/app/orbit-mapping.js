export const ORBIT_VISUAL_FIELD_MAP = Object.freeze({
  sourceSunType: 'source.shape',
  zoomDepth: 'reading.depth',
  planetBodies: 'regions',
  moonBodies: 'referents',
  tetherLinks: 'links',
  orbitalRadius: 'coupling',
  bodyMass: 'referent.mass',
  tetherThickness: 'bond.strength',
  bodyColor: 'referent.kind',
});

export function assertOrbitVisualIsMapped(property) {
  if (!Object.hasOwn(ORBIT_VISUAL_FIELD_MAP, property)) throw new TypeError(`Unmapped Orbit visual property: ${property}`);
  return ORBIT_VISUAL_FIELD_MAP[property];
}
