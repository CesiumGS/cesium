---
id: CS-1186
title: Merge CS-847 round 9 as experimental, with one boundary for all inlets next
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: "A. A. Merge as experimental: CS-847 merges as a batch of one once its gates pass; round 10 isn't sent; the next item, one boundary for every inlet tested by I1 to I3, follows the trust-model decision."
answered_at: 2026-11-24T06:24:30.049Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-847's round 9 now, its seam marked experimental, with one boundary for every SourceHost inlet as the next item?

The step back after round 9 found the boundary findings form a patch chain, rooted in an unstated trust model: a source is host-registered code in the engine's thread, and server data reaching it can't carry getters, proxies or forged typed arrays. Round 9's two new findings (a forged Float64Array allocating without bound, and a structuredClone error message carrying a pushed value into a report) are reachable only by source code. Every one of the 156 public names CS-847 adds is already marked experimental in `api/surface.txt`. Round 9 fixed review 8's five findings, four of them completely; T1's heap search misses canaries kept as two-part strings. The replay 0c00486b24 has the same patch as the branch, `api/surface.txt` included. It changes owner paths: `api/surface.txt` and `packages/core/src/index.ts`. Under your batch rule it merges as a batch of one, after its cheap gates and one full suite on the stack.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. A. Merge as experimental: CS-847 merges as a batch of one once its gates pass; round 10 isn't sent; the next item, one boundary for every inlet tested by I1 to I3, follows the trust-model decision.
- B. B. Hold it: Nothing merges; CS-145 and the other waiting items keep waiting.

Recommended: A. Merge as experimental. The seam is already experimental, the remaining findings need source code to reach, and 48 items wait on it.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
