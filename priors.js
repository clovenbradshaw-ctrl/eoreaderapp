// Fetches priors data straight from eopriors at runtime -- no vendoring, no
// copies. eopriors is the permanent, independent home for prior data; this
// repo (and every engine it swaps in) only ever reads from it over HTTP.
const EOPRIORS_REPO = 'clovenbradshaw-ctrl/eoPriors';
const EOPRIORS_REF = 'main';
const EOPRIORS_RAW_BASE = `https://raw.githubusercontent.com/${EOPRIORS_REPO}/${EOPRIORS_REF}`;

// path is relative to the eopriors repo root, e.g. "priors/corpus-prior.json"
export async function fetchPrior(path) {
  const res = await fetch(`${EOPRIORS_RAW_BASE}/${path}`);
  if (!res.ok) {
    throw new Error(`fetchPrior: ${path} -> ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function fetchCorpusPrior() {
  return fetchPrior('priors/corpus-prior.json');
}
