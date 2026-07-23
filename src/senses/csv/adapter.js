export function csvObservationEnvelope({ sourceId, bytes, decoderVersion = 'csv-sense@0.1', delimiter = ',' }) {
  const text = bytes instanceof Uint8Array ? new TextDecoder().decode(bytes) : String(bytes);
  const rows = text.split(/\r?\n/).filter((row) => row.length).map((row) => row.split(delimiter));
  const header = rows[0] || [];
  return {
    schema: 'ObservationEnvelope@1', sourceId, mediaType: 'text/csv', decoderVersion,
    delimiter, encoding: 'utf-8', quoting: 'observed',
    axes: [{ id: 'row', kind: 'ordered', count: rows.length }, { id: 'column', kind: 'ordered', count: header.length }],
    blocks: rows.map((cells, rowIndex) => ({ id: `${sourceId}:row:${rowIndex}`, rowIndex, cells: cells.map((raw, columnIndex) => ({ raw, typedCandidates: inferCandidates(raw), anchor: { rowIndex, columnIndex } })) })),
    warnings: [], loss: [], custody: { originalBytesPreserved: true },
  };
}

function inferCandidates(raw) {
  const candidates = [{ type: 'string', value: raw }];
  if (raw === '') candidates.push({ type: 'missing' });
  if (/^-?\d+(\.\d+)?$/.test(raw)) candidates.push({ type: 'number', value: Number(raw) });
  if (!Number.isNaN(Date.parse(raw))) candidates.push({ type: 'date', value: raw });
  return candidates;
}
