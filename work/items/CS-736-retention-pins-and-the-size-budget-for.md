---
id: CS-736
title: Retention, pins and the size budget for benchmark storage
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-734, CS-721]
touches: [packages/next/bench/suite/storage/**, packages/next/bench/suite/commands/storage.mjs, packages/next/bench/suite/commands/result.mjs, packages/next/bench/suite/views/Report.tsx, packages/next/bench/suite/views/Images.tsx, packages/next/test/bench*.test.ts]
---

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 8. Rough size: medium. Study citations come from CS-404 when it lands; until then, pins cover them.

Model: the most capable one for design-heavy parts, a fast one for the rest.

## Done when

- `dyno result pin <id> --reason <ref>` and `unpin` write events that every device sees after a sync (tested).
- `dyno storage status` reports use against the budget per namespace, and warns at 80% and at 100%. It never stops uploads or prunes on its own: the owner retains everything for now (CS-731), and pruning starts only when the owner asks (tested).
- `dyno storage prune` exists for when the owner turns pruning on. It deletes only with `--apply`, never deletes a pinned or cited run, refuses on a stale store, and writes tombstones. Dyno shows a pruned blob as removed, with its reason (tested).
