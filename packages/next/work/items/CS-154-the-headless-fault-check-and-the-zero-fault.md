---
id: CS-154
title: The headless fault check and the zero-fault parity guard
kind: work
status: Planned
created: 2026-11-13
project: CS-16
needs: [CS-149, CS-150, CS-151]
---

The headless fault check and the zero-fault parity guard.

## Done when

The check passes on its own port; every 2.0 parity page prints zero timeouts, retries and failures on a healthy run, at the full and the throttled profiles. Defaults adjusted if a floor was too low.

## Files

- `scripts/faultServer.mjs`
- `faultCheck.mjs`
- `parity/*.ts`
- `bench/suite`

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
