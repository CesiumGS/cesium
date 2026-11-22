---
id: CS-846
title: "D6: what is ion's interface, an asset resolver or a source of its own?"
kind: decision
state: done
created: 2026-11-21
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T05:07:04.439Z
answered_via: question-tool
answered_by: owner
---

## Question

What is ion's interface (CS-269)? Hosts and other services implement it, so it's a public commitment.

From CS-552's design (`docs/design/content-source-seam.md`, "Decisions for the owner"), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. An `AssetResolver`: a reference in; kind, location, renewable credentials, credits and version out, beside a credential provider. Ion is one resolver, not a source. (cost: a new public interface, named through CS-102.)
- B. Ion as a content source of its own, wrapping each kind it serves. (cost: ion's kinds tie to ion.)

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: A: an `AssetResolver`. Ion is one resolver, not a source.
