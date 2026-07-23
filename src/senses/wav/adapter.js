export function wavObservationEnvelope({ sourceId, bytes, decoderVersion = 'wav-sense@0.1' }) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('WAV adapter preserves original bytes as Uint8Array');
  const text = new TextDecoder('ascii').decode(bytes.slice(0, 12));
  if (!text.startsWith('RIFF') || !text.includes('WAVE')) throw new TypeError('Not a RIFF/WAVE source');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitDepth = view.getUint16(34, true);
  const dataBytes = view.getUint32(40, true);
  const bytesPerSampleFrame = Math.max(1, channels * (bitDepth / 8));
  const samples = Math.floor(dataBytes / bytesPerSampleFrame);
  return {
    schema: 'ObservationEnvelope@1', sourceId, mediaType: 'audio/wav', decoderVersion,
    axes: [{ id: 'sample', kind: 'ordered', unit: 'sample' }, { id: 'time', kind: 'ordered', unit: 'second' }, { id: 'channel', kind: 'categorical', count: channels }],
    blocks: [{ id: `${sourceId}:pcm`, kind: 'pcm', sampleRate, bitDepth, channels, samples, anchors: { sampleStart: 0, sampleEnd: samples } }],
    warnings: [], loss: [], custody: { originalBytesPreserved: true },
  };
}
