# eoreaderapp

The content/app shell. This repo owns the app surface; it does not own the
engine or the priors -- both are wired in from other repos so they can
evolve independently.

## Engine (swappable)

The engine currently live is `eoreader4.2`, vendored in as a git submodule
at `engine/eoreader4.2`. `engine.config.js` is the *only* file that names
which engine directory is active -- `index.html` reads it and loads the
engine's vendor scripts, `support.js`, and `src/rooms/reader/boot.js` (the
`window.EO` membrane the engine exposes to any surface).

To move to `eoreader5` once it's ready:

```
git submodule add https://github.com/clovenbradshaw-ctrl/eoreader5.git engine/eoreader5
```

then point `ENGINE_DIR` in `engine.config.js` at `engine/eoreader5` (and
update `ENGINE_ASSETS` if eoreader5's file layout differs). Nothing else in
this app should ever hardcode a path into an engine directory.

## Priors (permanent, external)

Priors live forever in [`eoPriors`](https://github.com/clovenbradshaw-ctrl/eoPriors)
and are never copied into this repo. `priors.js` fetches them at runtime
from eopriors' raw GitHub content (e.g. `priors/corpus-prior.json`), so
eopriors stays the single source of truth regardless of which engine is
mounted.
