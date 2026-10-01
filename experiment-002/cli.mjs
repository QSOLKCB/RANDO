#!/usr/bin/env node
// Dependency-free artifact renderer and replay checker. Node 22+.
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { config, render, makeReceipt, verifyReceipt, wavBytes, sha256 } from './core.mjs';

const [mode, ...args] = process.argv.slice(2);
try {
  if (mode === 'render' && args.length >= 1 && args.length <= 4) {
    const [directory, seed, bpm, delay] = args;
    const c = config({ seed, bpm: bpm === undefined ? undefined : Number(bpm),
      delay: delay === undefined ? undefined : Number(delay) });
    const receipt = await makeReceipt(c);
    const a = wavBytes(render(c).pcm), b = wavBytes(render(c, true).pcm);
    await mkdir(directory); // New directory required; never replace an earlier render.
    await writeFile(join(directory, 'A.wav'), a, { flag: 'wx' });
    await writeFile(join(directory, 'B.wav'), b, { flag: 'wx' });
    await writeFile(join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    console.log(`Rendered ${receipt.frames} frames per file into ${directory}`);
  } else if (mode === 'verify' && (args.length === 1 || args.length === 3)) {
    if ((await stat(args[0])).size > 16384) throw new Error('Receipt exceeds 16 KiB.');
    const receipt = JSON.parse(await readFile(args[0], 'utf8'));
    const result = await verifyReceipt(receipt);
    if (!result.verified) throw new Error(`Receipt mismatch: ${result.mismatches.join(', ')}`);
    if (args.length === 3) {
      for (const [path, field] of [[args[1], 'reference_wav_sha256'], [args[2], 'shifted_wav_sha256']]) {
        if ((await stat(path)).size !== 44 + receipt.frames * 2) throw new Error(`Wrong WAV length: ${path}`);
        if (await sha256(await readFile(path)) !== receipt[field]) throw new Error(`WAV mismatch: ${path}`);
      }
    }
    console.log(args.length === 3 ? 'VERIFIED / receipt replay and both supplied WAV files agree.'
      : 'VERIFIED / receipt replay agrees. No external WAV files were checked.');
  } else {
    throw new Error('Usage: node experiment-002/cli.mjs render NEW_DIRECTORY [SEED] [BPM] [DELAY]\n       node experiment-002/cli.mjs verify RECEIPT.json [A.wav B.wav]');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
