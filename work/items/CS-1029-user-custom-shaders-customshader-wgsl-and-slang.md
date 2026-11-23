---
id: CS-1029
title: User custom shaders (CustomShader WGSL and Slang, and CustomShader.fromSlang) pass the loop guard before they reach the GPU
kind: work
state: proposed
created: 2026-11-22
project: CS-8
---

> **Proposal.** Source: CS-971's GPU-safety review (2026-11-22). Why now: AGENTS.md's GPU-safety rule protects every app on the machine, and a user's `while (true)` in a custom shader reaches the GPU today. `loopGuard.ts` covers only user post stages. Size: small to medium. For alpha.1 if user custom shaders ship in it. Decider: owner. Filed 2026-11-22.

## Done when

- Every user shader path (`CustomShader` WGSL and Slang for models and tilesets, and `CustomShader.fromSlang`) runs through the loop guard, or is refused with a message that names the loop.
- A test feeds an unbounded loop through each path, and none reaches the GPU unguarded.
