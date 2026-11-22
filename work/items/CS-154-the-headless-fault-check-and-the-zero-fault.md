---
id: CS-154
title: The headless fault check and the zero-fault parity guard
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-149, CS-150, CS-151]
touches: [packages/next/scripts/faultServer.mjs, packages/next/scripts/faultCheck.mjs, packages/next/parity/*.ts, packages/next/bench/suite]
---

The headless fault check and the zero-fault parity guard.

## Done when

The check passes on its own port; every 2.0 parity page prints zero timeouts, retries and failures on a healthy run, at the full and the throttled profiles. Defaults adjusted if a floor was too low.

## Plan

`docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
