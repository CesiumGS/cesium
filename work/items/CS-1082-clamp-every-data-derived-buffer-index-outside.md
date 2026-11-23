---
id: CS-1082
title: Clamp every data-derived buffer index outside loops, and extend unclampedIndices to every entry point
kind: work
state: proposed
created: 2026-11-22
project: CS-8
needs: [CS-971]
---

> **Proposal.** Source: CS-971's executor and its GPU-safety review (2026-11-22). Why: 129 indices read from data are unclamped outside loops, across 12 kernels: the draw-record, transform, material, item, batch, job and argument tables. WebGPU's robust buffer access keeps them memory-safe, but a bad record can still produce wrong output. AGENTS.md says to clamp every buffer index. This replaces the executor's earlier proposal for the surface vertex pull and draw-record reads. Size: medium. Decider: owner. Filed 2026-11-22.

## Done when

- Every buffer index read from data is clamped, in and outside loops, in every kernel under `packages/core/src/**/*.slang`.
- `unclampedIndices` in `test/boundedLoops.test.ts` covers every entry point, and fails on a planted unclamped index.
- `npm run shaders:check` passes. The Metal output of each changed kernel is read with `scripts/dumpMsl.mjs` before its first browser run, and parity shows no pixel moved.
