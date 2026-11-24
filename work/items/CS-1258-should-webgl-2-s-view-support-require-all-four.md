---
id: CS-1258
title: Should WebGL 2's `view.support` require all four content kinds before it draws them?
kind: decision
state: planned
created: 2026-11-24
project: CS-8
decider: owner
---

> **Decision for the owner.** Source: CS-30 (the WebGL 2 renderer's facts and support rules), relayed by orch-11 (2026-11-24). It is a public shape. Filed 2026-11-24.

## Question

Should `view.support`'s `content.required` list all four content kinds (globe, terrain, imagery and meshes) on WebGL 2 before that renderer draws them, with the required-content invariant failing until it does? Or only the kinds it draws?

## Options

- A. All four. The plan's invariant 2 says every renderer persona supports the required content from its first persona. CS-36 and CS-37 each add a test that their kind actually draws.
- B. Only the kinds WebGL 2 draws today, growing as CS-36 and CS-37 land.

**Recommendation (the executor's):** A.
