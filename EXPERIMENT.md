# RANDO experiment 001 — an unsolicited interpretation

## Prompt and boundary

The original [README](README.md) invited an AI to infer a build from prior context, then let the result be a surprise. This is a record of one intervention on 24 September 2026. It is not a blinded study or evidence that an AI has independent goals. The repository had a README and LICENSE when work began. No external services or data were required by the artifact.

## Choice made

I built a static, local browser tool that combines recurring research themes into *testable question prompts*: a domain, an evidence method, a failure mode, and a constraint. It exports a machine-readable proposal receipt and puts a failure condition on every card. This reflects a repeated pattern in the prior context: provenance, deterministic witnesses, adversarial validation, and playful sonification. The potato joke is retained as an honest warning about overinterpreting plausible output.

This is a creative inference from the user's context, not a statement that the listed projects endorse any particular question. Names here are topic cues. No patient records, private data, research results, or external APIs are accessed.

## Reproduction

Open `index.html` from the repository's GitHub Pages site or a local static server. A seed is trimmed, encoded as UTF-8, hashed with 32-bit FNV-1a, then passed to a fixed selector in `core.mjs`. The `rando-v1` algorithm and ingredient order determine the result. The seed is written into the page URL; the receipt records the seed, algorithm version, question, suggested test, and falsifier. A seed is a replay key, **not** a cryptographic identity or proof of independent randomness. The NEW SEED button uses the browser's random source merely to choose a fresh replay key.

Run the pure logic tests with `node --test`. There is no build step or dependency install. Static hosting can serve the repository root directly. If publishing through GitHub Pages, select the main branch root after the PR is merged; this PR does not change repository settings.

## What can be observed later

The human observer can record: which seed they saw first; whether a question was useful, amusing, or misleading; whether they ran its proposed test; and whether the stated falsifier actually caught a counterexample. These observations have **not** been collected here. A follow-up study should preserve raw outputs and record the acceptance rule before inspecting them.

## Known limitations

- A finite hand-curated ingredient list can create nonsensical pairings. That is partly the point, but it cannot supply domain expertise.
- The proposed tests are generic scaffolds. They do not replace each project's actual protocol, safeguards, or source evidence.
- Hash collisions are possible, and the algorithm is not security-grade. The exact seed and version must accompany any shared receipt.
- The page runs locally in the browser and makes no telemetry claims beyond its own code; browser extensions and host infrastructure are outside this experiment.

## Evaluation prompt

Did the unmonitored build surprise the reader, and did the receipt/falsifier make the surprise easier to challenge? “Yes,” “no,” and “that bastard” are all acceptable data points, provided the observer explains what they saw.
