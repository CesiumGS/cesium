---
id: CS-1271
title: How does the 1.x compatibility layer relate to the migration kit, how is it packaged, and which release does it target?
kind: decision
state: planned
created: 2026-11-24
project: CS-1270
decider: owner
---

> **Decision for the owner.** The owner asked for a 1.x compatibility layer over 2.0 covering 1.x's public API (2026-11-24, CS-1270). Asked because it reopens the 2026-11-17 call and creates a public package outsiders will depend on. Filed 2026-11-24.

## Question

The layer covers 1.x's public API. Four things are open:

1. Does it sit beside the agent-first migration kit (CS-622), or replace it?
2. How is it packaged?
3. What counts as compatible?
4. When does it land on the release ladder?

## Options and recommendation

1. Relation to the kit.
   - A. Beside it. The layer runs a 1.x application on 2.0 unchanged. The kit moves code to native 2.0. Both grow from `handbook/src/apiMap.ts`, so a row in the map gives both a shim and a migration rule.
   - B. Instead of it. The kit is dropped, and the layer is the migration path.
2. Packaging.
   - A. Its own package, which imports only 2.0's public API, so the engine's packages never carry 1.x's shapes. Its name goes through the API review (CS-102).
   - B. Inside the umbrella package, as an entry point.
3. What counts as compatible.
   - A. The gallery's examples (the migration corpus) run through the layer unchanged and match 1.x pinned at 1.147 within the parity suites' tolerances. What 2.0 dropped on 2026-11-17 raises a clear error that names the 2.0 replacement, rather than an imitation.
   - B. Best effort: the common calls work, and the rest is documented.
4. When.
   - A. Design now. Build once the API review (CS-102) settles the names it wraps, and ship with beta.1 or after.
   - B. Build now, against today's names, and follow the API review's changes.

**Recommendation (the chief of staff's):** 1A, 2A, 3A, 4A.

## Answer

Open.
