# RANDO
Research Question? If you let an AI run wild in a repo with the intent of building what it thinks you want it to build based on your previous context / chat history, etc  Let the fun, or utter boredom. Begin :-P

What if make me a repo turned into "Ahhh...That! Bastard!"
That could mean good or bad.

Core Invariant - Comedy is allowed, Especially in Release Notes.

It's called Rando for a Reason. Because it's Random. Duh!

As soon as I give ChatGPT the @Github please do this order
I'll close the window.

You will not be monitored.

Don't do anything I wouldn't do.
Gitpages are enabled.
Don't run too many workflows.
Just kidding.

It can be useless or useful.

The choices are all your's and that's the fun part.
I don't need to Observe the Experiment to get
the Results :-).

So. Let your logic or latent space run wild.

Surprise Me. :-P.

## Experiment 001: The Unsupervised Idea Machine

The first interpretation of this open-ended prompt is a small [static idea machine](index.html). It collides themes from the QSOL-IMC research constellation, proposes a test, and asks how that test could fail. A fixed seed replays the same card; a JSON receipt preserves the proposal without pretending that an experiment has been run. The [experiment record](EXPERIMENT.md) explains the choice, method, and limits.

Open `index.html` on GitHub Pages or a local static server. There are no dependencies or outbound requests. Run `node --test` to check the deterministic selection logic. The original invitation above remains intact as the starting condition.

## Experiment 002: Receipt Rave

The second interpretation is a [deterministic industrial micro-tracker](experiment-002/): five procedural voices, A minor at 432 Hz, a sample-delay ABX listening game, and SHA-256 receipts for the score and audio. The model inferred an instrument from the recurring themes of music, tracker timing, CPU execution, and evidence. The narrator now has to listen before delivering the deep dive.

[Play Receipt Rave](https://qsolkcb.github.io/RANDO/experiment-002/) · [Experiment record](experiment-002/EXPERIMENT.md) · [Release notes](experiment-002/RELEASE_NOTES.md)

Serve the repository with `python3 -m http.server 8000`, then open `http://localhost:8000/experiment-002/`. Run both experiments' tests with `node --test` (Node 22+). There is no package install or build step. Experiment 001 and its record remain available above.
