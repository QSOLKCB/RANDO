// Receipt Rave v1. CPU synthesis with integer-valued state and PCM16 output.
// JavaScript Numbers carry exact integers here; this is not a chip emulator.
export const ENGINE = 'receipt-rave-v1';
export const SAMPLE_RATE = 24000;
export const BPMS = Object.freeze([120, 128, 135, 147]);
export const DELAYS = Object.freeze([0, 1, 16, 64, 256, 1024]);
export const LANES = Object.freeze(['PISTON', 'SNARE', 'SHRAPNEL', 'SUB', 'CARRIER']);
// Frozen millihertz: 12-tone equal temperament, A4 = 432 Hz.
const NOTES = Object.freeze([108000, 121227, 128435, 144163, 161817, 171438, 192436]);
const NAMES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
const SCALE = Object.freeze([0, 2, 3, 4, 6, 4, 2, 0]);
const trunc = Math.trunc;

export function config(input = {}) {
  const seed = input.seed ?? 'the-window-is-closed';
  const bpm = input.bpm ?? 147;
  const delay = input.delay ?? 64;
  if (typeof seed !== 'string' || !seed.trim() || [...seed.trim()].length > 64)
    throw new RangeError('Seed must contain 1–64 characters.');
  if (!BPMS.includes(bpm)) throw new RangeError('Unsupported tempo.');
  if (!DELAYS.includes(delay)) throw new RangeError('Unsupported sample delay.');
  return { seed: seed.trim(), bpm, delay };
}

function hashSeed(seed) {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(seed)) h = Math.imul(h ^ byte, 0x01000193) >>> 0;
  return h;
}

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}

export function stepFrame(step, bpm) {
  return trunc((step * SAMPLE_RATE * 60 + bpm * 2) / (bpm * 4));
}

export function makeScore(input) {
  const c = config(input);
  const next = random(hashSeed(c.seed));
  const transpose = next() % 4;
  const events = [];
  const add = (step, lane, note, salt) => events.push({ step, lane, note, salt });
  for (let step = 0; step < 64; step++) {
    const r = next();
    const beat = step % 16;
    if (beat % 4 === 0 || (beat === 14 && (r & 1))) add(step, 0, 0, r);
    if (beat === 4 || beat === 12 || (step > 47 && beat === 15)) add(step, 1, 0, r ^ 0x51);
    if (beat % 2 === 0 || (step > 31 && (r >>> 20) % 3 === 0)) add(step, 2, 0, r ^ 0x72);
    if (beat % 4 === 0 || beat === 7 || beat === 15) add(step, 3, [0, 0, 5, 3][trunc(step / 16)], r);
    if (beat % 2 === 0 || beat === 11 || beat === 15)
      add(step, 4, SCALE[(trunc(beat / 2) + transpose + trunc(step / 16)) % 8], r);
  }
  return { engine: ENGINE, seed: c.seed, bpm: c.bpm, steps: 64, events };
}

const phaseIncrement = mhz => trunc(mhz * 4294967296 / (SAMPLE_RATE * 1000));
const triangle = phase => {
  const p = phase >>> 20;
  return p < 2048 ? p * 2 - 2048 : 6143 - p * 2;
};
const pulse = phase => (phase >>> 24) < 72 ? 1536 : -600;

function voice(event, start, mix, level = 1024) {
  const lane = event.lane;
  const length = [7200, 3000, 1000, 5200, 3100][lane];
  const amplitude = [5100, 2400, 700, 2500, 1600][lane];
  const frequency = NOTES[event.note] * (lane === 4 ? 4 : 1);
  let phase = 0, second = 0, smooth = 0;
  const noise = random(event.salt);
  for (let i = 0; i < length && start + i < mix.length; i++) {
    let value;
    if (lane === 0) {
      const mhz = 47000 + trunc(125000 * (length - i) * (length - i) / (length * length));
      phase = (phase + phaseIncrement(mhz)) >>> 0;
      value = triangle(phase);
      if (i < 64) value += trunc(((noise() >>> 20) - 2048) * (64 - i) / 64);
    } else if (lane === 1 || lane === 2) {
      phase = (phase + phaseIncrement(lane === 1 ? 181000 : 3487000)) >>> 0;
      second = (second + phaseIncrement(5213000)) >>> 0;
      const n = (noise() >>> 20) - 2048;
      value = lane === 1 ? trunc((n * 3 + triangle(phase)) / 4)
        : trunc((n + ((phase ^ second) >>> 31 ? 2048 : -2048)) / 2);
    } else {
      phase = (phase + phaseIncrement(frequency)) >>> 0;
      const raw = lane === 3 ? trunc((triangle(phase) * 3 + pulse(phase)) / 4) : pulse(phase);
      smooth += trunc((raw - smooth) / (lane === 3 ? 4 : 2));
      value = smooth;
    }
    const attack = Math.min(64, i);
    const envelope = trunc((length - i) * 1024 / length);
    const shaped = trunc(value * amplitude / 2048);
    mix[start + i] += trunc(shaped * envelope * attack * level / (1024 * 64 * 1024));
  }
}

// delay shifts only the CARRIER lane and its echoes. Both outputs have equal length.
export function render(input, shifted = false) {
  const c = config(input);
  const score = makeScore(c);
  const frames = stepFrame(64, c.bpm) + SAMPLE_RATE;
  const mix = new Int32Array(frames);
  for (const event of score.events) {
    const offset = shifted && event.lane === 4 ? c.delay : 0;
    const start = stepFrame(event.step, c.bpm) + offset;
    voice(event, start, mix);
    if (event.lane === 4) {
      voice(event, start + stepFrame(3, c.bpm), mix, 256);
      voice(event, start + stepFrame(6, c.bpm), mix, 96);
    }
  }
  const pcm = new Int16Array(frames);
  let peak = 0, clipped = 0;
  for (let i = 0; i < frames; i++) {
    const sample = mix[i];
    if (sample > 32767 || sample < -32768) clipped++;
    pcm[i] = Math.max(-32768, Math.min(32767, sample));
    peak = Math.max(peak, Math.abs(pcm[i]));
  }
  return { pcm, score, peak, clipped };
}

export function pcmBytes(pcm) {
  const bytes = new Uint8Array(pcm.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < pcm.length; i++) view.setInt16(i * 2, pcm[i], true);
  return bytes;
}

export function wavBytes(pcm) {
  const raw = pcmBytes(pcm);
  const bytes = new Uint8Array(44 + raw.length);
  const view = new DataView(bytes.buffer);
  const label = (offset, text) => [...text].forEach((x, i) => view.setUint8(offset + i, x.charCodeAt(0)));
  label(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true);
  label(8, 'WAVE'); label(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true); view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  label(36, 'data'); view.setUint32(40, raw.length, true); bytes.set(raw, 44);
  return bytes;
}

export function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && Object.getPrototypeOf(value) === Object.prototype)
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  throw new TypeError('Canonical data must contain only JSON values and safe integers.');
}

export async function sha256(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function makeReceipt(input) {
  const c = config(input);
  const a = render(c), b = render(c, true);
  const [score, ah, bh, aw, bw] = await Promise.all([
    sha256(new TextEncoder().encode(canonical(a.score))), sha256(pcmBytes(a.pcm)),
    sha256(pcmBytes(b.pcm)), sha256(wavBytes(a.pcm)), sha256(wavBytes(b.pcm))
  ]);
  return { schema: 'rando.audio-receipt.v1', engine: ENGINE, ...c,
    sample_rate: SAMPLE_RATE, frames: a.pcm.length, score_sha256: score,
    reference_pcm_sha256: ah, shifted_pcm_sha256: bh,
    reference_wav_sha256: aw, shifted_wav_sha256: bw,
    reference_peak: a.peak, shifted_peak: b.peak,
    reference_clipped: a.clipped, shifted_clipped: b.clipped };
}

export async function verifyReceipt(receipt) {
  if (!receipt || Object.getPrototypeOf(receipt) !== Object.prototype) throw new TypeError('Expected a receipt object.');
  if (receipt.schema !== 'rando.audio-receipt.v1' || receipt.engine !== ENGINE)
    throw new Error('Unsupported receipt schema or engine.');
  const c = config(receipt);
  if (c.seed !== receipt.seed) throw new Error('Receipt seed is not normalized.');
  const expected = await makeReceipt(c);
  if (canonical(Object.keys(receipt).sort()) !== canonical(Object.keys(expected).sort()))
    throw new Error('Receipt fields differ from the v1 schema.');
  const mismatches = Object.keys(expected).filter(k => receipt[k] !== expected[k]);
  return { verified: mismatches.length === 0, mismatches };
}

export function scoreLabel(event) {
  return event.lane >= 3 ? NAMES[event.note] + (event.lane === 4 ? '4' : '2') : '×';
}

// Caller supplies a browser-random bit. The seed is deliberately not the ABX answer key.
export function trial(bit, choice) {
  if (bit !== 0 && bit !== 1) throw new RangeError('Trial bit must be 0 or 1.');
  if (choice !== 'A' && choice !== 'B') throw new RangeError('Choice must be A or B.');
  return { x: bit === 0 ? 'A' : 'B', choice, correct: choice === (bit === 0 ? 'A' : 'B') };
}
