---
id: CS-1187
title: Which trust model do 2.0's seams assume about code a host registers?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-24T06:32:10.052Z
answered_via: question-tool
answered_by: owner
---

## Question

Do 2.0's seams treat code a host registers (a content source, and later other seams' plugins) as trusted code, or as a hostile source the engine must contain?

CS-847's step back found that its patch chain came from an unstated trust model. The content-source boundary trusts what a source hands it at several inlets: `admit`, the sinks' position and column checks, change-set messages, `budget.want` and `settle`, and `jobs.submit`. Round 9's last findings (a forged `Float64Array` that allocates without bound, and an error message that carries a pushed value into a report) are reachable only by source code. Server data reaching a source can't carry getters, proxies or forged typed arrays. Other seams will take the same approach, so the answer sets a pattern.

Rule basis: novelty (no precedent). Reversibility: two-way.

## Options and recommendation

- A. Trusted code: a source is trusted code. The seam guarantees snapshot semantics (no late reads), bounded work per push (a forged length is refused before allocation), and engine-made text with no values in it. Isolating a hostile source is the host's job. Untrusted plugins become a later exploration.
- B. Hostile source: the engine contains a hostile source itself, in a worker-hosted source host it can terminate, with structured clone as the boundary. Async everywhere, and a copy on every push.

Recommended: A. Trusted code. It closes the classes CS-847's rounds kept finding without a worker host, and isolation can be added later behind the same seam if untrusted plugins are needed.

## Answer

Recorded in the front matter once answered.
