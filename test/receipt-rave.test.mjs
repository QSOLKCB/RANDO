import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config, render, makeScore, makeReceipt, verifyReceipt, canonical, pcmBytes, wavBytes,
  stepFrame, SAMPLE_RATE, BPMS, DELAYS, trial } from '../experiment-002/core.mjs';

const golden = {
  schema: 'rando.audio-receipt.v1', engine: 'receipt-rave-v1',
  seed: 'the-window-is-closed', bpm: 147, delay: 64, sample_rate: 24000, frames: 180735,
  score_sha256: 'b962d33584d3510d3379d99e74ac22f1383bc0489f8eb2294a9ff009975d86d4',
  reference_pcm_sha256: 'd2cd4ae492adfa0cc4a5b989d9b077f0e83a0ff1fba8da5742ca6a339dbad96a',
  shifted_pcm_sha256: '6292a1dcb77d05e9322bd6442b70f5675fa039d53b607585b06368f51e2440a7',
  reference_wav_sha256: '9a4cce27073049436d53bd148e9ba9c3b95aaff63d20f0d0ca01bf85ea2e863d',
  shifted_wav_sha256: '78f19e0eebec8e347129874ae44ed3aa5a0021b14cd4a0722cac303be96cf300',
  reference_peak: 9519, shifted_peak: 8816, reference_clipped: 0, shifted_clipped: 0
};

test('v1 frozen score, PCM, WAV and statistics replay exactly', async () => {
  assert.deepEqual(await makeReceipt(config()), golden);
  assert.deepEqual(await verifyReceipt(golden), { verified: true, mismatches: [] });
});

test('seed normalization, Unicode, and parameter bounds are explicit', () => {
  assert.equal(config({ seed: '  α🙂  ' }).seed, 'α🙂');
  assert.doesNotThrow(() => config({ seed: '🙂'.repeat(64) }));
  for (const seed of ['', ' ', 1, '🙂'.repeat(65)]) assert.throws(() => config({ seed }));
  for (const bpm of [0, 148, '147', true, NaN]) assert.throws(() => config({ bpm }));
  for (const delay of [-1, 2, '64', true, Infinity]) assert.throws(() => config({ delay }));
});

test('the score is unaffected by delay and has bounded, ordered events', () => {
  assert.deepEqual(makeScore({ delay: 0 }), makeScore({ delay: 1024 }));
  const score = makeScore({ seed: 'integer-pistons' });
  assert.equal(score.steps, 64);
  assert.equal(new Set(score.events.map(e => e.lane)).size, 5);
  for (const e of score.events) {
    assert.ok(e.step >= 0 && e.step < 64 && e.lane >= 0 && e.lane < 5);
    assert.ok(e.note >= 0 && e.note < 7);
  }
  assert.notDeepEqual(score, makeScore({ seed: 'integer-pistons!' }));
});

test('zero-delay control is byte-identical; every nonzero delay changes PCM', () => {
  const a = render({ delay: 0 });
  assert.deepEqual(a.pcm, render({ delay: 0 }, true).pcm);
  for (const delay of DELAYS.slice(1)) {
    const b = render({ delay }, true);
    assert.equal(b.pcm.length, a.pcm.length);
    assert.notDeepEqual(b.pcm, a.pcm);
    assert.deepEqual(render({ delay }).pcm, a.pcm);
  }
});

test('timing uses cumulative nearest-frame boundaries without per-step rounding drift', () => {
  assert.equal(stepFrame(64, 147), 156735);
  assert.equal(stepFrame(64, 120), 192000);
  assert.equal(stepFrame(0, 147), 0);
  assert.equal(SAMPLE_RATE, 24000);
});

test('synthetic corpus renders non-silent PCM without clipping at all tempos', () => {
  for (const seed of ['the-window-is-closed', 'a', 'potato', 'α🙂']) for (const bpm of BPMS) {
    for (const shifted of [false, true]) {
      const r = render({ seed, bpm, delay: 1024 }, shifted);
      assert.ok(r.peak > 1000 && r.peak < 32768);
      assert.equal(r.clipped, 0);
      assert.equal(r.pcm.length, stepFrame(64, bpm) + SAMPLE_RATE);
      assert.equal(r.pcm.at(-1), 0, 'tail must fit within the fixed render');
    }
  }
});

test('WAV uses standard mono PCM16 little-endian header and sample encoding', () => {
  const pcm = Int16Array.from([-32768, -1, 0, 1, 32767]);
  assert.deepEqual([...pcmBytes(pcm)], [0,128,255,255,0,0,1,0,255,127]);
  const bytes = wavBytes(pcm), view = new DataView(bytes.buffer), text = new TextDecoder();
  assert.equal(text.decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(text.decode(bytes.slice(8, 12)), 'WAVE');
  assert.equal(text.decode(bytes.slice(12, 16)), 'fmt ');
  assert.equal(text.decode(bytes.slice(36, 40)), 'data');
  assert.equal(view.getUint32(4, true), bytes.length - 8);
  assert.equal(view.getUint16(20, true), 1); assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 24000); assert.equal(view.getUint32(28, true), 48000);
  assert.equal(view.getUint16(32, true), 2); assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), pcm.length * 2);
  assert.deepEqual(bytes.slice(44), pcmBytes(pcm));
});

test('canonical score JSON sorts keys and rejects non-JSON and non-integer values', () => {
  assert.equal(canonical({ z: [null, true, 7], a: 'α' }), '{"a":"α","z":[null,true,7]}');
  for (const value of [1.5, NaN, Infinity, undefined, 2 ** 53, { a: undefined }, new Date()])
    assert.throws(() => canonical(value));
});

test('receipt rejects changed hash, numeric type, fields, engine, and normalized seed', async () => {
  for (const field of ['score_sha256', 'reference_pcm_sha256', 'shifted_pcm_sha256', 'reference_wav_sha256', 'shifted_wav_sha256']) {
    const r = await verifyReceipt({ ...golden, [field]: '0'.repeat(64) });
    assert.deepEqual(r, { verified: false, mismatches: [field] });
  }
  assert.equal((await verifyReceipt({ ...golden, frames: String(golden.frames) })).verified, false);
  await assert.rejects(verifyReceipt({ ...golden, engine: 'future-v2' }));
  await assert.rejects(verifyReceipt({ ...golden, extra: true }));
  await assert.rejects(verifyReceipt({ ...golden, seed: ' the-window-is-closed ' }));
  const missing = { ...golden }; delete missing.bpm;
  await assert.rejects(verifyReceipt(missing));
  await assert.rejects(verifyReceipt(null));
});

test('ABX answer mapping records caller-supplied random bits and rejects invalid choices', () => {
  assert.deepEqual(trial(0, 'A'), { x: 'A', choice: 'A', correct: true });
  assert.deepEqual(trial(1, 'A'), { x: 'B', choice: 'A', correct: false });
  assert.deepEqual(trial(1, 'B'), { x: 'B', choice: 'B', correct: true });
  assert.throws(() => trial(2, 'A')); assert.throws(() => trial(0, 'X'));
});

test('CLI checks supplied files and refuses damaged WAVs and reused output directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'receipt-rave-'));
  const cli = fileURLToPath(new URL('../experiment-002/cli.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  const out = join(root, 'render');
  try {
    assert.equal(run('render', out).status, 0);
    const receipt = join(out, 'receipt.json'), a = join(out, 'A.wav'), b = join(out, 'B.wav');
    assert.equal(run('verify', receipt, a, b).status, 0);
    assert.notEqual(run('render', out).status, 0);
    const bytes = await readFile(a); bytes[100] ^= 1; await writeFile(a, bytes);
    const bad = run('verify', receipt, a, b);
    assert.equal(bad.status, 1); assert.match(bad.stderr, /WAV mismatch/);
    assert.equal(run('verify', receipt).status, 0);
    await writeFile(receipt, JSON.stringify({ ...golden, reference_peak: 0 }));
    assert.equal(run('verify', receipt).status, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
