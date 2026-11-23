---
id: CS-1145
title: The handbook becomes Dyno's Docs page, with an export to one self-contained page on demand
kind: work
state: planned
created: 2026-11-23
project: CS-389
needs: [CS-1027, CS-1144]
---

> **Committed by the owner (2026-11-23):** "move the handbook into dyno, the static html generation thing hasn't been useful, so i'd rather have it as a docs page in dyno itself", and CS-1144 C for outside readers.

## Done when

- The handbook's tabs render as a Docs page in Dyno's rail, with the same content and the generated figures read from the same sources (`api/surface.txt`, the import-boundary test, `scripts/checkBundle.mjs`, the library build, `bench/results` and pinned runs).
- The Docs page can export one self-contained HTML page on demand, for outside readers, with nothing private in it (`hitld publish check` on the export).
- The always-on static build (`npm run handbook`) and the handbook server on 5199 are retired. The owner's 5199 server is stopped only after the owner agrees.
- AGENTS.md's handbook section, `handbook/DESIGN.md`, the launch configs and the skills describe the new home. AGENTS.md is an owner path.
- It's checked in both themes, at 380 px wide, by keyboard, with reduced motion and a clean console.
