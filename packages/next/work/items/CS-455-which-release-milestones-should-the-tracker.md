---
id: CS-455
title: "Which release milestones should the tracker have: alphas, betas, release candidates, 2.0.0?"
kind: decision
status: Planned
created: 2026-11-14
project: CS-18
decided-by: owner
---

## Question

Which release milestones should the tracker have, and what does each mean? A release is a gate: a milestone that needs only other milestones, the ones it must contain to be feature complete. On the board's milestone map each gate is a flag in the Releases lane; measuring to one shows what it needs, its critical path and each milestone's slack to it, and puts what it doesn't need in a band of its own. Gates carry no dates: they sit where their milestones put them, in steps or in tokens.

Candidates: alphas, betas, release candidates, 2.0.0. What each one needs is a later decision per gate; this one settles which gates exist and what each promises.

## Options and recommendation

- **A ladder:** 2.0.0-alpha (a host can build on it; the API may still change), 2.0.0-beta (feature complete for 2.0; the API changes only through a review you approve), 2.0.0-rc (only fixes after it; parity and the docs done), 2.0.0. Each is a gate; alphas and release candidates may repeat (alpha.2, rc.2) as pre-releases of the same gate.
- **Two gates:** "2.0.0 is feature complete" and 2.0.0 itself; pre-releases are tagged when convenient, not planned.
- **Gates per audience:** separate gates for what different users need first, joined at 2.0.0.

Recommendation: the ladder. It gives each public API review a place (the first before the beta's API freeze, a later one before the release candidate), and HITLd's release records already take pre-release tags (`--pre rc` gives `rc.1`, `rc.2`), so the tags follow the gates. Then, per gate, a decision on which milestones it needs.

## Answer

Open.
