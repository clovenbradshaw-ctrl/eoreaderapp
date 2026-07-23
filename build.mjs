#!/usr/bin/env node
// Regenerates the deployed page (index.html) from the app source (eoreader_app.html).
//
// Why this exists: GitHub Pages serves index.html. Historically index.html was an
// opaque, hand-exported bundle that drifted out of sync with eoreader_app.html —
// fixes landed in the source but were never re-bundled, so the live site was frozen
// on an old build. This script makes the source the single source of truth.
//
// The dc-runtime (support.js) is self-sufficient: it loads React from a CDN and
// boots the <x-dc> app on DOMContentLoaded. eoreader_app.html already references
// ./support.js, so the deployed page is simply the app source verbatim, with
// support.js committed alongside it.
//
// Usage: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'eoreader_app.html';
const OUT = 'index.html';

const src = readFileSync(SRC, 'utf8');
if (!/src="\.\/support\.js"/.test(src)) {
  console.error(`Expected ${SRC} to reference ./support.js — aborting.`);
  process.exit(1);
}
writeFileSync(OUT, src);
console.log(`Regenerated ${OUT} from ${SRC} (${src.length} bytes).`);
