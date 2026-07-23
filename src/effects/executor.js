export async function executeEffectRequest(request, handler) {
  if (request.schema !== 'EffectRequest@1') throw new TypeError('Unsupported effect request');
  const result = await handler(request);
  return { schema: 'EffectResult@1', requestId: request.id, algorithm: request.algorithm, version: request.version, config: request.config, inputAnchors: request.inputAnchors, contentHash: result.contentHash, value: result.value };
}
