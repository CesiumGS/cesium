---
id: CS-733
title: Each run records its device, configuration and state
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-390, CS-721]
touches: [packages/next/bench/suite/identity.mjs, packages/next/bench/suite/telemetry.mjs, packages/next/bench/suite/reuse.mjs, packages/next/bench/suite/commands/device.mjs, packages/next/bench/suite/cli.mjs, packages/next/bench/suite/report.mjs, packages/next/bench/suite/data.ts, packages/next/bench/suite/schema.ts, packages/next/bench/run.mjs, packages/next/scripts/setup.mjs, packages/next/test/bench*.test.ts]
---

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 8. Rough size: medium. Power source moves from the machine key into `state`. CS-407's `reuse.mjs` change becomes `servedFrom` in the configuration.

Model: the most capable one for design-heavy parts, a fast one for the rest.

## Done when

- A run records `device` (ID, alias, hardware, hardware key, class), `configuration` (its fields, `configKey` and `seriesKey`) and `state`, beside CS-390's `machine`.
- `dyno device enroll`, `show` and `list` work, and `enroll` refuses the host name or the user name as an alias (tested).
- On fixtures, a switch of power source changes only `state`. Reuse matches on `reuseKey` (device ID plus `configKey`, replacing `machineKey`) and the same power source (tested).
- A denylist test finds no host name, user name, serial number, GPU UUID, MAC or IP address in any identity field.
- An existing store loads unchanged, and its legacy runs read under the device after enrollment, with no file changed (tested).
