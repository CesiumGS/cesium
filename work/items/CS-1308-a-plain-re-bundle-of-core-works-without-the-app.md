---
id: CS-1308
title: A plain re-bundle of core works without the app serving core's dist/assets
kind: work
state: proposed
created: 2026-11-24
project: CS-199
needs: [CS-969]
---

> **Proposal.** Source: CS-363's report (packaging for pages without a build step), relayed by orch-11's report audit (2026-11-24). Why now: a plain re-bundle of core fails unless the app serves core's dist/assets, because the wasm is named from a path the bundler doesn't see. The executor recommends documenting the serve-the-folder recipe for alpha.1. This may be a decision instead. Size: small to medium. Decider: owner. Filed 2026-11-24.

## Done when

- A plain re-bundle of core works without the app serving core's dist/assets: the library names its wasm from main-thread code, or uses the new Worker(new URL(...)) pattern bundlers follow.
- Or, if the owner prefers for alpha.1, the serve-the-folder recipe is documented and this waits.
