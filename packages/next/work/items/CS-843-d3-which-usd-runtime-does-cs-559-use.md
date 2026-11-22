---
id: CS-843
title: "D3: which USD runtime does CS-559 use?"
kind: decision
state: done
created: 2026-11-21
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T05:07:01.393Z
answered_via: question-tool
answered_by: owner
---

## Question

Which USD runtime does CS-559 use?

From CS-552's design (`docs/design/content-source-seam.md`, "Decisions for the owner"), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. A spike first: OpenUSD in WebAssembly against a TypeScript subset reader (USDZ with USDC and USDA, no plugins), then decide. (cost: a spike before CS-559.)
- B. OpenUSD in WebAssembly. (cost: a large new dependency.)
- C. A TypeScript subset reader only. (cost: partial USD.)
- D. No runtime: USD reaches the engine only through the B-rep tiler. (cost: no live USD.)

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: A: a spike first, OpenUSD in WebAssembly against a TypeScript subset reader. CS-833's SimReady study shares the spike.
