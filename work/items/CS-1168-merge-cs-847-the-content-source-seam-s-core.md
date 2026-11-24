---
id: CS-1168
title: Merge CS-847, the content-source seam's core, after one more round?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: "A. A. Fix all five, then merge: One round fixes both engine holes and closes the three oracle gaps, each shown with a mutation that now fails, plus the cheap Minors. A scoped check confirms each fix, then the orchestrator merges with `merge-item.sh` once the gates pass on the replay. No further full review."
answered_at: 2026-11-24T02:42:30.976Z
answered_via: question-tool
answered_by: owner
---

## Question

CS-847's one review after round 8 (your CS-1151 A) found five Important problems. Fix all five in one more round and then merge, fix only the two engine holes and merge, or hold the merge?

Round 8 did what CS-1149 A, CS-1150 A and the `admit` design asked: undeclared content gets a random session name, declared names follow the character class, and one `admit` function checks every push. 361 of 361 focused tests pass and the brief's seven mutations each fail a test. The Opus review that attacks the oracles found two holes in the engine today: a taxonomy named like an Object prototype member (`toString`, `constructor`, `__proto__`) loses its labels, and `admit` reads a push's fields more than once, so a getter can queue an array it never copied, past every limit. It also found three engine changes that break an oracle's invariant and still pass it: names from a counter or `Math.random` instead of crypto, a private cache of canary keys that T1 can't see, and dropped or region-only invalidations that T2 never produces. The fixes are local (records without a prototype, one read per field, a stubbed-crypto test, a heap-snapshot search, a T2 round that piles up invalidations and sends valid regions), not a new structure. The replay onto main (0bcf390a58) has the same patch as the branch; its full gates were stopped for your measurement pause and run before any merge. It changes owner paths: `api/surface.txt` and `packages/core/src/index.ts` (from earlier rounds; round 8 changed no public name).

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. A. Fix all five, then merge: One round fixes both engine holes and closes the three oracle gaps, each shown with a mutation that now fails, plus the cheap Minors. A scoped check confirms each fix, then the orchestrator merges with `merge-item.sh` once the gates pass on the replay. No further full review. (cost: One more executor round and a scoped check.)
- B. B. Fix the two holes, then merge: One round fixes the lost taxonomies and `admit`'s repeated reads only; the three oracle gaps and the Minors become a follow-up item. Merge after a scoped check and the gates. (cost: A smaller round; the oracles keep three known blind spots until the follow-up.)
- C. C. Hold it: Nothing merges and no round starts; CS-145, CS-978 and the seam items keep waiting.

Recommended: A. Fix all five, then merge. The oracle rule says each oracle fails on any engine that breaks its invariant, and each of the three gaps is a concrete change that passes. All five fixes are local, so one round closes them without another review cycle.

If unanswered by 2026-11-26T12:00:00Z: C. Hold it.

## Answer

Recorded in the front matter once answered.
