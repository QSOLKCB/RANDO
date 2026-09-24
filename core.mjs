// Pure, versioned card selection. No network calls and no claims of empirical evidence.
export const VERSION = 'rando-v1';

const domains = [
  { name: 'Psycle tracker playback', fixture: 'a delayed/retrigger command fixture and its rendered WAV' },
  { name: 'the LEAF local-first pharmacy protocol', fixture: 'fake patient records and a canonical JSON exchange fixture' },
  { name: 'E8 root sonification', fixture: 'a small labeled root subset and its deterministic audio mapping' },
  { name: 'QEC crossbar routing', fixture: 'a tiny matrix, a request, and a route receipt' },
  { name: 'the semantic relay', fixture: 'two contradictory evidence manifests and their source snapshots' },
  { name: 'a NotebookLM audio dialogue', fixture: 'a short synthetic script and its generated transcript' },
  { name: 'the claim ledger', fixture: 'a reviewed source record and a deliberately altered source record' },
  { name: 'GLUBALL rendering', fixture: 'two sampled meshes with identical logical input' }
];
const methods = [
  'a hash-bound witness',
  'an adversarial mutation',
  'a fixed-seed replay',
  'a minimal counterexample',
  'a pair of independently checked receipts',
  'a human-blind comparison'
];
const failures = [
  'an identity substitution',
  'a plausible but false continuity claim',
  'an unnoticed partial output',
  'a provenance gap',
  'a misleadingly stable summary',
  'an interpretation that outruns its evidence'
];
const constraints = [
  'no network access',
  'only synthetic inputs',
  'a single frozen version',
  'a documented time budget',
  'one changed byte at a time',
  'a second person able to reproduce the result'
];

export function normalizeSeed(seed) {
  if (typeof seed !== 'string') throw new TypeError('Seed must be text');
  const normalized = seed.trim();
  if (!normalized || [...normalized].length > 80) throw new RangeError('Seed must contain 1–80 characters');
  return normalized;
}

// FNV-1a over UTF-8 bytes. This is a stable selector, not a security hash.
export function seedHash(seed) {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(normalizeSeed(seed))) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function makeCard(seed) {
  const normalized = normalizeSeed(seed);
  const hash = seedHash(normalized);
  let state = hash;
  function pick(items) {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return items[((t ^ (t >>> 14)) >>> 0) % items.length];
  }
  const domain = pick(domains);
  const method = pick(methods);
  const failure = pick(failures);
  const constraint = pick(constraints);
  return {
    version: VERSION,
    seed: normalized,
    id: `RANDO-${hash.toString(16).toUpperCase().padStart(8, '0')}`,
    status: 'proposed / untested',
    question: `Can ${method} expose ${failure} in ${domain.name} with ${constraint}?`,
    test: `Start with ${domain.fixture}. Record the expected output, then vary one relevant condition and keep both raw outputs and their hashes. State the decision rule before inspecting the result.`,
    falsifier: `If the same rule also flags an unchanged control, or misses a known injected ${failure}, reject this idea as phrased. Record the counterexample.`,
    ingredients: { domain: domain.name, method, failure, constraint }
  };
}
