# RANDO experiment 002 — Receipt Rave

## The invitation

On 2 October 2026 in Australia/Adelaide (1 October UTC), Trent invited a second model to build what it inferred he would want from previous context, then closed the window to preserve the surprise. The [original README](../README.md) delegates the creative choice and explicitly permits comedy. The starting commit was `bd3c2eb9fd6fa763800a3864fcba57c00d870fd1`; Experiment 001 was already present.

This record describes one context-guided software intervention. It is not a controlled comparison of models. The user's label for this run was “Sol 6.1”; this repository does not independently attest the serving model, hidden instructions, or provider infrastructure.

## The choice

Build an actual instrument: **Receipt Rave**, a tiny industrial tracker with a listening challenge and inspectable audio receipts.

The supplied context repeatedly connected industrial electronic music, deterministic patterns, historical tracker timing, CPU execution, and provenance. A recent discussion about hearing playback differences suggested a particularly useful junction: generate the same loop twice, move one lane by an exact number of source samples, and let the listener compare it before seeing the answer.

The implementation follows that inference. It does not claim to discover the user's true preferences. The available context was a supplied memory summary and targeted retrieval, including the previous RANDO experiment; it was not an exhaustive transcript. That exposure means this run is neither independent of Experiment 001 nor blind to its outcome. No raw chat history is embedded in the artifact. The instrument itself uses only its procedural score and synthetic sound sources.

The recurring evidence theme also shaped the stopping point: a playable, bounded experiment with replay checks, rather than a growing research roadmap. The original invitation and Experiment 001's code and record are preserved; its landing page gets one link to the new experiment.

## What was built

- Four bars, 64 sixteenth-note steps, five lanes: PISTON, SNARE, SHRAPNEL, SUB, CARRIER.
- Deterministic procedural percussion, bass, pulse lead, and two lead echoes. These are original synthetic voices, not Psycle, SID, or Prophet emulation.
- A fixed A-minor note table based on 12-tone equal temperament with A4 = 432 Hz. Tuning is a creative choice with no therapeutic claim.
- 120, 128, 135, or 147 BPM. Timing boundaries are rounded from cumulative rational time, so independently rounding each step cannot accumulate drift.
- Reference A and shifted B. B shifts every CARRIER event and its echoes by 0, 1, 16, 64, 256, or 1024 frames at a 24,000 Hz source rate. All other voices retain the same event state, timing, and gain. Both buffers have the same length.
- WAV, render receipt, and listening-record downloads, plus a dependency-free Node replay checker.

There is no inference call, account, package dependency, persistent storage, analytics, or external media in the instrument. Loading the page still involves its static host and browser. Each rendered voice carries integer-valued state; JavaScript's exact-integer Number range is used for arithmetic, and the output is mono signed PCM16. Playback converts those source samples to Web Audio floats. The waveform uses an ordinary 2D canvas with no explicit GPU or WebGL API; browser compositing is outside the implementation's control.

## Replay

Use Node 22+ from the repository root:

```sh
node --test
node experiment-002/cli.mjs render ./rave-output 'the-window-is-closed' 147 64
node experiment-002/cli.mjs verify ./rave-output/receipt.json ./rave-output/A.wav ./rave-output/B.wav
```

The output directory must be new. `verify RECEIPT.json` without WAV arguments checks regeneration only; it does not inspect external audio files. Supplying both WAV paths checks their exact bytes too.

For the browser, serve the repository root with `python3 -m http.server 8000` and open `http://localhost:8000/experiment-002/`, or use its existing HTTPS GitHub Pages host. ES modules need a static server; Web Crypto needs HTTPS or localhost. Seed, tempo, and delay are encoded in the URL. The seed is trimmed and accepts 1–64 Unicode code points; no Unicode normalization is applied.

The score selector uses FNV-1a over UTF-8 bytes, then a 32-bit linear congruential generator. Neither is cryptographically random. The fixed engine identifier, note table, voice rules, and score ordering define the replay. Source changes that alter output require a new engine version and golden vector.

## What the receipt establishes

`rando.audio-receipt.v1` stores settings, engine identity, source rate, frame count, rendered peak/clipping counts, and separate SHA-256 hashes for:

1. The score as recursively key-sorted JSON with safe integers and no whitespace.
2. Reference and shifted PCM, encoded explicitly as little-endian signed 16-bit samples.
3. Reference and shifted WAV bytes, including their 44-byte headers.

The checker regenerates the expected receipt and rejects missing or extra fields, unsupported engines, type substitutions, and mismatches. JSON imports check parsed field values, not the textual formatting of the receipt file; ordinary JSON parsing resolves duplicate keys. Receipt file bytes themselves are not hashed or authenticated.

A successful check establishes agreement with this version of this renderer. It is not an independently implemented verifier, a signature, a chain-of-custody system, a timestamp attestation, or an integration with PROVENANCE. A modified renderer can endorse its own output. The frozen tests help detect accidental version drift; they do not make the implementation a trust anchor.

Default reference vector: 180,735 frames, peak 9,519, zero clipped samples; PCM SHA-256 `d2cd4ae492adfa0cc4a5b989d9b077f0e83a0ff1fba8da5742ca6a339dbad96a`.

## The listening game

An eight-trial session freezes the current settings. A and B keep their reference roles throughout. Each trial uses a fresh browser-random bit to choose whether X plays the A or B buffer. Playback begins only after a button click. The interface requires an audition of each label before accepting an answer, then hides correctness until completion or an explicit early exit. An audition means playback was started; it does not certify that a person listened to the entire clip.

The export retains the audio receipt, each revealed X mapping and answer, and each started audition with its trial number, label, gain at start, and browser device sample rate. Subsequent slider changes are not captured. There is no local persistence: navigating away loses the session unless it has been exported. Starting another session replaces the previous in-memory record.

The zero-sample control has identical PCM. Its random label assignments still exist in the export, but the UI reports no meaningful hearing score for those assignments. For other delays, a score describes this session only. The tool does not infer significance, establish a threshold, or generalize to other listeners.

Limits: this is informal local blinding, not adversarial concealment. Source inspection, browser debugging, or an exported mapping can reveal the answers. Browser resampling, output device latency, acoustics, headphones, level, and expectations can affect what a listener hears. Source sample displacement is exact; speaker delivery timing is not measured. Overlap changes can alter mix peaks naturally; there is no per-variant loudness normalization. Procedural pulses are band-unlimited and may alias. No human listening result was collected during development.

## What to observe on return

Trent can record whether the build was surprising, useful, amusing, or unwanted; which contextual cues it seemed to capture; which assumptions missed; and whether he keeps any audio or listening records. Those observations are pending. Acceptance is not inferred from the absence of supervision.

The potato remains an unsuitable control for human preference. It did, however, correctly reject every claim of sub-bass authorship.
