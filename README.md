# eoreaderapp

`eoreaderapp` is the mobile-first product shell around EOReader5. The app owns source custody, neutral decoding, local state, effects, security, sync, and every user-facing projection. The engine owns semantic discovery and neutral projections; cards, outlines, charts, and prose in this repo are disposable app projections of engine artifacts.

## Repository boundary

The app implements the outside-world side of the EOReader5 flow:

```text
source bytes
  -> SenseOrgan
  -> ObservationEnvelope@1 + ObservationBlock set
  -> EOReader5
  -> SemanticEvent@1 / ReadingSnapshot@1 / ProjectionBundle@1
  -> OutputOrgan
  -> mobile source view, cards, outline, sheets
```

Only the app dereferences URLs, reads files, accesses browser storage, calls optional models, or executes `EffectRequest` values. App-only priors such as preferences, accessibility settings, lens, horizon, and budgets stay local and must not be published as global eoPriors.

## Engine integration

`engine.config.js` is now a build-time package/adapter selection manifest. It names public packages such as `@eoreader/engine`, `@eoreader/spec`, and the optional `@eoreader/compat-4.2` package; it must not list deep paths into vendored engine assets.

The EOReader5 adapter lives under `src/engine/`:

- `adapter.js` validates cross-boundary input, imports only the public engine package, streams deterministic event-count progress, persists semantic events before presentation, and supports worker execution.
- `protocol.js` defines the app/worker protocol and validation helpers.
- `worker.js` runs engine work off the main UI thread when available.
- `legacy-42-adapter.js` creates explicit transfer envelopes for the compatibility route.

No mutable engine singleton is exposed on `window`; the selected engine version is part of `SessionRecord` identity.

## Prior resolution

`priors.js` re-exports the pinned prior resolver in `src/priors/`. A moving catalog URL may be fetched to discover available snapshots, but a session pins only a content-addressed `PriorSnapshot@1`.

The resolver verifies schema version, snapshot hash, operator epoch, engine compatibility range, and pack hashes before use. Immutable snapshot bytes are cached by ID. Existing sessions are never silently upgraded; if a pinned snapshot is unavailable, the UI should offer cached use, explicit replacement, or no-empirical-prior mode.

## Local replay state

`src/state/` defines an append-only event model for `SourceRecord`, `CustodyEvent`, `DecoderRun`, `ObservationArtifact`, `SessionRecord`, `EngineRun`, `SemanticEvent`, `EffectRun`, `ReadingPointer`, and `UserDelta`. Original source bytes are immutable, user edits are deltas, and derived projections are disposable caches.

## Mobile projection shell

The primary navigation is `Source · Structure · Ask`. Source views preserve native reading modes; Structure navigates engine-discovered boundaries, kinds, parameters, transitions, and higher-order organization; Ask queries the current immutable source and selected reading context. Core interactions must not depend on hover and must remain functional from 320 CSS px upward.

Output organs live under `src/outputs/` and render engine projections for text, audio, tables, images, code, structure cards, outlines, connections, provenance, and Ask. Optional model-generated labels or explanations must be checked against the closed inventory of engine hypotheses and exact anchors.

## Sense organs

Sense organs live under `src/senses/` and emit neutral observations only. The WAV adapter preserves original bytes, channels, sample/time axes, and exact sample anchors without asserting beats, motifs, instruments, or themes. The CSV adapter preserves raw cells, delimiter/header observations, ambiguity candidates, row/column axes, and exact cell anchors without asserting trends, regimes, anomalies, causes, or kinds.

## Contract checks

Run the dependency contract check with:

```sh
node --test tests/contracts/dependency-rules.test.mjs
```

It asserts that engine package imports are isolated to `src/engine/`, prior resolution is isolated to `src/priors/`, sense organs do not import output organs, output organs do not implement discovery algorithms, and EOReader5 adapter code cannot import legacy compatibility code.
