---
id: CS-730
title: "How does dyno talk to the bucket: its own small client or a dependency?"
kind: decision
state: done
created: 2026-11-19
project: CS-389
decider: owner
answer: A
answered_at: 2026-11-20T04:31:18.657Z
answered_via: question-tool
answered_by: owner
---

## Question

Talking to an S3-compatible bucket needs request signing (SigV4). Is that hand-written, or a new dependency?

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 9.

## Options and recommendation

- A. A small hand-written SigV4 client on Node's fetch and crypto (put, get, head, list, delete), tested against the S3 documentation's signature examples and an in-process fake: no new dependency.
- B. A small pinned signing dependency: less code to own, one dependency to review.
- C. The provider's full SDK: complete, but a large dependency tree for five calls.

Recommended: A.

Reversibility: two-way.

## Answer

A, dyno signs its own requests with a small hand-written SigV4 client, with no new dependency (owner, 2026-11-19). The owner asked whether the dyno command does this; it does in every option, and the choice was only what's inside it.
