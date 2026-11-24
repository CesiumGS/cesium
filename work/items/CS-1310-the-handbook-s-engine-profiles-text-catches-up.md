---
id: CS-1310
title: "The handbook's engine-profiles text catches up: CS-35's probe and WebGL 2 device, and the overview's status row"
kind: work
state: planned
created: 2026-11-24
project: CS-9
---

> **Committed by the owner (2026-11-24).** Asked how the handbook's engine-profiles text should catch up, the owner chose "In the branches, plus one item (Recommended)": CS-27 and CS-29 update the handbook in their own branches before they merge, and this item covers the rest on main. Filed 2026-11-24.

## Done when

- The architecture tab's "Engine profiles" paragraph covers CS-35: the probe, the `renderer` option and the empty WebGL 2 device. The compatibility tab's WebGL 2 section says what is built, not only what is planned.
- The overview's status row for threads, jobs, renderers and engine profiles names what is built of the profiles (the device's facts, the catalog and resolver, the paths in one place, support reports, and the probe), and its "checked" date is current.
- Each changed tab's "checked" date and status are updated, and `npm run handbook` builds.
