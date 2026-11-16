---
id: CS-455
title: "Which release items should the tracker have: alphas, betas, release candidates, 2.0.0?"
kind: decision
state: done
created: 2026-11-14
project: CS-18
decider: owner
---

## Question

Which release items should the tracker have, and what does each mean? A release is a release item (human-in-the-lead's format): a work item with a `release` version, such as `2.0.0-alpha.1`, that needs the milestones and items it must contain; everything it needs that isn't done is a gate. Milestones are never named by version. On the board's milestone map each gate is a flag in the Releases lane; measuring to one shows what it needs, its critical path and each milestone's slack to it, and puts what it doesn't need in a band of its own. Gates carry no dates: they sit where their milestones put them, in steps or in tokens.

Candidates: alphas, betas, release candidates, 2.0.0. What each one needs is a later decision per gate; this one settles which gates exist and what each promises.

## Options and recommendation

- **A ladder:** 2.0.0-alpha (a host can build on it; the API may still change), 2.0.0-beta (feature complete for 2.0; the API changes only through a review you approve), 2.0.0-rc (only fixes after it; parity and the docs done), 2.0.0. Each is a release item; alphas and release candidates may repeat (alpha.2, rc.2), each with a release item of its own, since there is one per version.
- **Two gates:** "2.0.0 is feature complete" and 2.0.0 itself; pre-releases are tagged when convenient, not planned.
- **Gates per audience:** separate gates for what different users need first, joined at 2.0.0.

Recommendation: the ladder. It gives each public API review a place (the first before the beta's API freeze, a later one before the release candidate), and HITLd's release records already take pre-release tags (`--pre rc` gives `rc.1`, `rc.2`), so the tags follow the gates. Then, per gate, a decision on which milestones it needs.

## Answer

The owner, 2026-11-15: the ladder. Four release items, each a work item with a `release` version that needs the one before it: 2.0.0-alpha.1 (a host can build on it; the API may still change), 2.0.0-beta.1 (feature complete for 2.0; the API changes only through a review the owner approves), 2.0.0-rc.1 (only fixes after it; parity and the docs done), and 2.0.0. Alphas and release candidates may repeat (alpha.2, rc.2), each with a release item of its own. Which milestones each gate needs is a decision per gate, one for each of the four.

The main session creates the four release items and the four decisions with `hitld work new` (only it creates items, since CS-522).

Reworded on 2026-11-15 for human-in-the-lead's release items (HITLD-129): the question and the recommendation are unchanged; a gate is now a release item rather than a milestone that needs only milestones.
