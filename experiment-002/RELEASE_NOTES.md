# Receipt Rave v0.1.0 — The sub has a receipt

Experiment 002 in RANDO. A context-guided surprise built on 2 October 2026 (Adelaide).

## Added

- A deterministic, five-lane industrial micro-tracker with 432 Hz A-minor tuning.
- Four tempos, six exact source-sample delay settings, and a visible 64-step score.
- Reference/shifted auditions, an eight-trial ABX game, and an identical-reference control.
- PCM16 WAV exports, SHA-256 render receipts, listening records, and a Node replay checker.
- A one-character tamper demonstration. The checksum has declined to be “interesting.”
- One CI workflow for both experiments' tests and static Pages deployment after a successful main-branch test run.

Experiment 001 remains available. No external audio, sample pack, synthesizer library, or model call is required.

## Validation and limits

The local Node suite passes **14/14 tests**, including the original three tests, a frozen audio vector, all tempo settings over four synthetic seeds, identical control, nonzero-delay differences, WAV encoding, altered receipts, and a damaged external WAV. FFprobe recognizes the default export as mono PCM16 at 24 kHz, 7.530625 seconds.

The receipt establishes deterministic byte agreement. The listening game records an informal session. Neither grants diplomatic immunity to a narrator who says “let's unpack the bass.”

Human preference and listening outcomes remain unobserved. See [the experiment record](EXPERIMENT.md) for replay instructions and the full boundaries.
