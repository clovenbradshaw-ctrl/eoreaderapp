// excerpt-highlight.js — highlights interesting tokens in entity excerpts
// Uses the source's extracted highlights (a.hi) as the signal for "interesting."

const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall','can',
  'to','of','in','for','on','with','at','by','from','as','into','through','during',
  'before','after','above','below','between','out','off','over','under','again',
  'further','then','once','here','there','when','where','why','how','all','both',
  'each','few','more','most','other','some','such','no','nor','not','only','own',
  'same','so','than','too','very','just','because','but','and','or','if','while',
  'about','up','it','its','this','that','these','those','i','me','my','we','our',
  'you','your','he','him','his','she','her','they','them','their','what','which',
  'who','whom'
]);

function tokenize(text) {
  return text.match(/[\w''-]+/g) || [];
}

function normalizeToken(t) {
  return t.toLowerCase().replace(/^['']+|['']+$/g, '');
}

// Build a set of interesting normalized tokens from the source's highlights.
export function buildHighlightTokenSet(highlights) {
  if (!highlights || highlights.length === 0) return new Set();
  const tokens = new Set();
  for (const h of highlights) {
    for (const t of tokenize(h)) {
      const n = normalizeToken(t);
      if (n.length > 2 && !STOP_WORDS.has(n)) tokens.add(n);
    }
  }
  return tokens;
}

// Given an excerpt string and a highlight token set, return HTML with <mark> tags
// wrapped around tokens that appear in the highlight set.
export function highlightExcerpt(excerpt, tokenSet) {
  if (!excerpt || !tokenSet || tokenSet.size === 0) return excerpt;
  return excerpt.replace(/([\w''-]+)/g, (match) => {
    const n = normalizeToken(match);
    if (tokenSet.has(n)) return `<mark style="background:#fef08a;border-radius:2px;padding:0 1px">${match}</mark>`;
    return match;
  });
}
