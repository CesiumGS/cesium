---
id: CS-20
title: Facts and personas
kind: work
state: planned
created: 2026-11-13
project: CS-8
---

Facts and personas. Needs nothing.

## Done when

- `DeviceFacts` reports every feature the device granted: all 12 requested, not 6.
- `DeviceFacts` carries the adapter info, including `isFallbackAdapter`.
- `DeviceFacts` carries the probe results, with `unknown` where a probe errors.
- `test/fakeGpu.ts` stands up each named persona.
- The full suite's results are unchanged.

## Files

- `src/gpu/device.ts`
- `test/fakeGpu.ts`

Detail: `docs/superpowers/plans/2026-11-13-engine-profiles.md`, its milestone table.
