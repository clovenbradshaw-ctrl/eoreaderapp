// Audio sense organ: PCM samples in, a Reading@1 out (docs/omnimodal
// perception spec, §2-3). This is a perceiver in the app/engine sense —
// it answers "what are the units, what is each unit's field vector, what
// is the metric" and nothing more. No structure-finding (SSM, novelty,
// recurrence, individuation) happens here; that is engine territory.
import { magnitudeSpectrum } from './fft.js';
import { hannWindow } from './window.js';
import { resampleLinear, monoSum } from './resample.js';
import { computeChroma } from './chroma.js';
import { melFilterbank, computeTimbre } from './timbre.js';
import { computeMoments } from './moments.js';
import { onsetEnvelope, pickOnsetPeaks, estimateTempo } from './onsets.js';

export const TARGET_SAMPLE_RATE = 22050;
export const FRAME_SIZE = 4096;
export const HOP_SIZE = 1024;
export const MEL_FILTERS = 26;

const CHROMA_DIMS = 12;
const TIMBRE_DIMS = 13;
const MOMENTS_DIMS = 5;

export const AUDIO_FIELD_SPEC = Object.freeze({
  channels: [
    { name: 'chroma', dims: CHROMA_DIMS, metric: 'cosine' },
    { name: 'timbre', dims: TIMBRE_DIMS, metric: 'cosine' },
    { name: 'moments', dims: MOMENTS_DIMS, metric: 'euclidean-standardised' },
  ],
});

export function frameSignal(samples, frameSize, hop) {
  const frames = [];
  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    frames.push(samples.subarray(start, start + frameSize));
  }
  if (frames.length === 0 && samples.length > 0) {
    const padded = new Float32Array(frameSize);
    padded.set(samples);
    frames.push(padded);
  }
  return frames;
}

// Frame the (already mono, already resampled) signal and compute the three
// field-vector channels per frame. Exported standalone so callers who only
// want per-frame fields (e.g. a future full-resolution detail pass, §3.2)
// don't have to go through the whole Reading@1 assembly.
export function extractFrameFields(samples, sampleRate, { frameSize = FRAME_SIZE, hop = HOP_SIZE } = {}) {
  const frames = frameSignal(samples, frameSize, hop);
  const window = hannWindow(frameSize);
  const filterbank = melFilterbank(MEL_FILTERS, frameSize, sampleRate);
  let prevMags = null;
  const perFrame = frames.map((frame) => {
    const windowed = new Float64Array(frameSize);
    for (let i = 0; i < frameSize; i++) windowed[i] = frame[i] * window[i];
    const mags = magnitudeSpectrum(windowed);
    const chroma = computeChroma(mags, sampleRate, frameSize);
    const timbre = computeTimbre(mags, filterbank, TIMBRE_DIMS);
    const moments = computeMoments({ mags, prevMags, sampleRate, fftSize: frameSize, frameSamples: frame });
    prevMags = mags;
    return { chroma, timbre, moments };
  });
  return { frames: perFrame, frameSize, hop, sampleRate };
}

// Beat-synchronous averaging (§3.1, last bullet): average frames within each
// boundary-delimited segment before they become units. This is what makes
// the SSM built downstream tempo-invariant — skipping it is the most common
// reason a music self-similarity matrix looks like noise.
function beatSyncAverage(perFrame, boundaries) {
  const units = [];
  for (let s = 0; s < boundaries.length - 1; s++) {
    const from = boundaries[s], to = boundaries[s + 1];
    const count = to - from;
    if (count <= 0) continue;
    const chroma = new Float64Array(CHROMA_DIMS);
    const timbre = new Float64Array(TIMBRE_DIMS);
    const moments = new Float64Array(MOMENTS_DIMS);
    for (let i = from; i < to; i++) {
      const f = perFrame[i];
      for (let d = 0; d < CHROMA_DIMS; d++) chroma[d] += f.chroma[d] / count;
      for (let d = 0; d < TIMBRE_DIMS; d++) timbre[d] += f.timbre[d] / count;
      for (let d = 0; d < MOMENTS_DIMS; d++) moments[d] += f.moments[d] / count;
    }
    units.push({ from, to, chroma, timbre, moments });
  }
  return units;
}

async function contentHash(bytes) {
  const g = globalThis;
  if (g.crypto && g.crypto.subtle && typeof g.crypto.subtle.digest === 'function') {
    const digest = await g.crypto.subtle.digest('SHA-256', bytes);
    const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hex}`;
  }
  // Deterministic non-cryptographic fallback for environments without Web
  // Crypto (e.g. older test runners). Never claims to be sha256.
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

// The perceiver entry point: raw per-channel PCM in, Reading@1 out.
// `sourceBytes`, if given, is the original encoded file — used only to
// derive `content_hash` and per-unit `block_id`s, never re-decoded here.
export async function buildAudioReading({ channelData, sampleRate, sourceBytes, perceiver = {} }) {
  if (!channelData || channelData.length === 0) throw new RangeError('buildAudioReading requires at least one channel of samples');
  if (!sampleRate) throw new RangeError('buildAudioReading requires sampleRate');

  const summed = monoSum(channelData);
  const resampled = resampleLinear(summed, sampleRate, TARGET_SAMPLE_RATE);
  const { frames } = extractFrameFields(resampled, TARGET_SAMPLE_RATE);

  const fluxSeries = frames.map((f) => f.moments[1]);
  const envelope = frames.length > 0 ? onsetEnvelope(fluxSeries) : new Float64Array(0);
  const onsetFrameIdx = pickOnsetPeaks(envelope);
  const hopSeconds = HOP_SIZE / TARGET_SAMPLE_RATE;
  const tempo = estimateTempo(envelope, hopSeconds);

  const interior = onsetFrameIdx.filter((i) => i > 0 && i < frames.length);
  const boundaries = [...new Set([0, ...interior, frames.length])].sort((a, b) => a - b);
  const beatUnits = beatSyncAverage(frames, boundaries.length > 1 ? boundaries : [0, frames.length]);

  const hash = sourceBytes ? await contentHash(sourceBytes) : null;

  const units = beatUnits.map((u, idx) => ({
    pos: (u.from * HOP_SIZE) / TARGET_SAMPLE_RATE,
    span: ((u.to - u.from) * HOP_SIZE) / TARGET_SAMPLE_RATE,
    field: [...u.chroma, ...u.timbre, ...u.moments],
    block_id: `block:${hash || 'inline'}:${idx}`,
  }));

  const extent = frames.length > 0 ? (frames.length * HOP_SIZE + FRAME_SIZE) / TARGET_SAMPLE_RATE : 0;

  const discard = [
    { kind: 'phase-spectrum', reason: 'magnitude-only STFT; phase discarded when computing field vectors', recoverable: false },
    { kind: 'sample-rate-reduction', reason: `resampled from ${sampleRate} Hz to ${TARGET_SAMPLE_RATE} Hz before analysis`, recoverable: true },
    { kind: 'channel-collapse', reason: `${channelData.length} channel(s) summed to mono before analysis`, recoverable: true },
    { kind: 'sub-frame-detail', reason: 'beat-synchronous averaging collapses frames within a unit to a single field vector', recoverable: true },
  ];

  const perceiverInfo = {
    id: 'audio-field-vectors',
    version: '0.1.0',
    ...perceiver,
    params: {
      frameSize: FRAME_SIZE,
      hop: HOP_SIZE,
      targetSampleRate: TARGET_SAMPLE_RATE,
      melFilters: MEL_FILTERS,
      ...(perceiver.params || {}),
    },
  };

  return {
    schema: 'Reading@1',
    medium: 'audio',
    axis: { kind: 'time', unit: 's', extent },
    units,
    field_spec: AUDIO_FIELD_SPEC,
    segments_proposed: [],
    sightings: [],
    display_words: { foreground: 'stated', present: 'in the texture', latent: 'implied', attributive: 'credited' },
    discard,
    perceiver: perceiverInfo,
    content_hash: hash,
    tempo: { bpm: tempo.bpm, periodSeconds: tempo.periodSeconds, method: 'onset-autocorrelation' },
  };
}
