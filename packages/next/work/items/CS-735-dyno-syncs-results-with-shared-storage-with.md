---
id: CS-735
title: Dyno syncs results with shared storage, with keys per device and role
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-734, CS-726, CS-727, CS-730]
touches: [packages/next/bench/suite/storage/**, packages/next/bench/suite/commands/storage.mjs, packages/next/bench/suite/commands/device.mjs, packages/next/bench/suite/commands/result.mjs, packages/next/test/bench*.test.ts, packages/next/.claude/skills/measuring-with-dyno/SKILL.md]
---

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 8. Rough size: large. If CS-726 is answered C (blobs on their devices through the hub), this item needs CS-406, which isn't in alpha.1.

Model: the most capable one for design-heavy parts, a fast one for the rest.

## Done when

- Runs from two temporary devices appear in each other's Dyno after `dyno storage sync`, and a screenshot downloads when opened (against a fake bucket; the owner checks once on two real devices).
- No object is ever overwritten, and uploads wait while `dyno status` isn't quiet (tested).
- Canary secrets appear in no output, log, result or file, and no command takes a secret as an argument (tested).
- Joining, setting credentials, rotating a key and removing a device behave as designed. A later object under a removed device's prefix is ignored and flagged. A remote reader can list, show and fetch, but can't write, pin or delete (tested).
- Inspector recordings upload like every other blob (CS-731).
- Remote and cloud reading is on by default (CS-727): each enabled environment gets a read-only key through its secrets, never a committed file, and that key can list, show and fetch but not write, pin or delete (tested).
