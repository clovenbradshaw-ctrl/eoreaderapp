import test from 'node:test';
import assert from 'node:assert/strict';
import { magnitudeSpectrum } from '../../src/senses/audio/fft.js';
import { hannWindow } from '../../src/senses/audio/window.js';
import { computeChroma } from '../../src/senses/audio/chroma.js';
import { monoSum, resampleLinear } from '../../src/senses/audio/resample.js';
import { estimateTempo, pickOnsetPeaks } from '../../src/senses/audio/onsets.js';
import { buildAudioReading } from '../../src/senses/audio/reading.js';

function sineWave(freq, sampleRate, n, amp = 1) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return out;
}

// Deterministic PRNG (mulberry32) so the white-noise tests are repeatable.
function whiteNoise(n, seed = 42) {
  let s = seed >>> 0;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
  return out;
}

test('fft: magnitude spectrum of a pure tone peaks at the driving frequency bin', () => {
  const sr = 22050, n = 4096, freq = 1000;
  const window = hannWindow(n);
  const tone = sineWave(freq, sr, n);
  const windowed = Float64Array.from(tone, (v, i) => v * window[i]);
  const mags = magnitudeSpectrum(windowed);
  let peakBin = 0, peakVal = -Infinity;
  for (let k = 1; k < mags.length; k++) if (mags[k] > peakVal) { peakVal = mags[k]; peakBin = k; }
  const expectedBin = Math.round((freq * n) / sr);
  assert.ok(Math.abs(peakBin - expectedBin) <= 1, `expected peak near bin ${expectedBin}, got ${peakBin}`);
});

test('fft: DC input produces energy only in bin 0', () => {
  const n = 64;
  const frame = new Float64Array(n).fill(1);
  const mags = magnitudeSpectrum(frame);
  assert.ok(mags[0] > 0);
  for (let k = 1; k < mags.length; k++) assert.ok(mags[k] < 1e-9, `bin ${k} should be ~0, got ${mags[k]}`);
});

// Acceptance §11.2: "Chroma of a synthesised pure tone concentrates on one
// pitch class; of white noise, is flat."
test('chroma: a pure A4 (440 Hz) tone concentrates on pitch class A', () => {
  const sr = 22050, n = 4096;
  const window = hannWindow(n);
  const tone = sineWave(440, sr, n);
  const windowed = Float64Array.from(tone, (v, i) => v * window[i]);
  const mags = magnitudeSpectrum(windowed);
  const chroma = computeChroma(mags, sr, n);

  const A_PITCH_CLASS = 9; // C=0, C#=1, ... A=9
  let maxIdx = 0;
  for (let i = 1; i < 12; i++) if (chroma[i] > chroma[maxIdx]) maxIdx = i;
  assert.equal(maxIdx, A_PITCH_CLASS);
  assert.ok(chroma[A_PITCH_CLASS] > 0.8, `expected concentrated chroma energy, got ${chroma[A_PITCH_CLASS]}`);
});

test('chroma: a pure C5 (523.25 Hz) tone concentrates on pitch class C, one octave up from C4', () => {
  const sr = 22050, n = 4096;
  const window = hannWindow(n);
  const tone = sineWave(523.25, sr, n);
  const windowed = Float64Array.from(tone, (v, i) => v * window[i]);
  const mags = magnitudeSpectrum(windowed);
  const chroma = computeChroma(mags, sr, n);
  let maxIdx = 0;
  for (let i = 1; i < 12; i++) if (chroma[i] > chroma[maxIdx]) maxIdx = i;
  assert.equal(maxIdx, 0); // C
});

test('chroma: white noise is roughly flat across pitch classes', () => {
  const sr = 22050, n = 4096;
  const window = hannWindow(n);
  const noise = whiteNoise(n);
  const windowed = Float64Array.from(noise, (v, i) => v * window[i]);
  const mags = magnitudeSpectrum(windowed);
  const chroma = computeChroma(mags, sr, n);

  const mean = chroma.reduce((a, b) => a + b, 0) / 12;
  const variance = chroma.reduce((a, b) => a + (b - mean) ** 2, 0) / 12;
  const stdDev = Math.sqrt(variance);
  assert.ok(stdDev < mean, `expected roughly flat chroma (stdDev < mean), got stdDev=${stdDev} mean=${mean}`);
});

test('resample: monoSum averages channels rather than clipping', () => {
  const left = Float32Array.from([1, 1, 1]);
  const right = Float32Array.from([-1, -1, -1]);
  const mono = monoSum([left, right]);
  assert.deepEqual(Array.from(mono), [0, 0, 0]);
});

test('resample: resampleLinear preserves duration-implied sample count', () => {
  const samples = new Float32Array(44100); // 1s @ 44.1kHz
  const resampled = resampleLinear(samples, 44100, 22050);
  assert.ok(Math.abs(resampled.length - 22050) <= 1);
});

test('onsets: a click train yields tempo close to its true rate', () => {
  // Synthetic onset envelope: a sharp pulse every 20 frames.
  const period = 20;
  const envelope = new Float64Array(400);
  for (let i = 0; i < envelope.length; i += period) envelope[i] = 1;
  const hopSeconds = HOP_SECONDS_FOR_TEST;
  const { bpm } = estimateTempo(envelope, hopSeconds, { minBpm: 40, maxBpm: 240 });
  const trueBpm = 60 / (period * hopSeconds);
  assert.ok(Math.abs(bpm - trueBpm) / trueBpm < 0.05, `expected ~${trueBpm} bpm, got ${bpm}`);
});
const HOP_SECONDS_FOR_TEST = 1024 / 22050;

test('onsets: pickOnsetPeaks finds isolated spikes above the local median', () => {
  const envelope = [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0];
  const peaks = pickOnsetPeaks(envelope, { medianWindow: 3, delta: 0.2 });
  assert.deepEqual(peaks, [3, 8]);
});

test('buildAudioReading: synthetic two-tone recording yields a well-formed Reading@1', async () => {
  const sr = 22050, seconds = 3, n = sr * seconds;
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const freq = t < 1.5 ? 440 : 880;
    samples[i] = 0.5 * Math.sin(2 * Math.PI * freq * t);
  }

  const reading = await buildAudioReading({ channelData: [samples], sampleRate: sr });

  assert.equal(reading.schema, 'Reading@1');
  assert.equal(reading.medium, 'audio');
  assert.equal(reading.axis.kind, 'time');
  assert.ok(reading.axis.extent > 2.9 && reading.axis.extent < 3.2);
  assert.ok(reading.units.length > 0);

  const expectedDims = reading.field_spec.channels.reduce((sum, c) => sum + c.dims, 0);
  assert.equal(expectedDims, 30); // chroma 12 + timbre 13 + moments 5, per §3.1
  for (const unit of reading.units) {
    assert.equal(unit.field.length, expectedDims);
    assert.ok(Number.isFinite(unit.pos));
    assert.ok(unit.span > 0);
    assert.ok(typeof unit.block_id === 'string' && unit.block_id.length > 0);
  }
});

// Acceptance §11.8: "Every perceiver populates discard[]; a perceiver with
// an empty discard array fails conformance, because every perceiver
// discards something."
test('buildAudioReading: discard[] is always populated and typed', async () => {
  const sr = 22050;
  const samples = whiteNoise(sr); // 1 second
  const reading = await buildAudioReading({ channelData: [samples], sampleRate: sr });
  assert.ok(reading.discard.length > 0);
  for (const entry of reading.discard) {
    assert.ok('kind' in entry && 'reason' in entry && 'recoverable' in entry);
    assert.equal(typeof entry.recoverable, 'boolean');
  }
});

test('buildAudioReading: content_hash and per-unit block_id are populated when source bytes are given', async () => {
  const sr = 22050;
  const samples = sineWave(220, sr, sr);
  const sourceBytes = new Uint8Array([1, 2, 3, 4, 5]);
  const reading = await buildAudioReading({ channelData: [samples], sampleRate: sr, sourceBytes });
  assert.ok(reading.content_hash && reading.content_hash.includes(':'));
  for (const unit of reading.units) assert.ok(unit.block_id.startsWith('block:'));
});

test('buildAudioReading: throws on missing channel data or sample rate', async () => {
  await assert.rejects(() => buildAudioReading({ channelData: [], sampleRate: 22050 }), RangeError);
  await assert.rejects(() => buildAudioReading({ channelData: [new Float32Array(10)], sampleRate: 0 }), RangeError);
});
