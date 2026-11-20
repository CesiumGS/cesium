---
id: CS-724
title: "Setup notices when the sky pack, or other data it built, is out of date, and asks to be run again"
kind: work
state: planned
created: 2026-11-19
project: CS-192
touches: [packages/next/src/atmosphere/skyPack.ts, packages/next/scripts/skyPack.mjs, packages/next/scripts/setup.mjs, packages/next/test/**]
---

`npm run test:data` fails `test/data/skyPack.test.ts` on main and in every worktree: "modeled: expected a list of strings". The American-spelling commit of 2026-11-15 (1604c3329f) renamed the manifest key `modelled` to `modeled` in the reader (`src/atmosphere/skyPack.ts`) and the builder (`scripts/skyPack.mjs`), but kept `format: 1`. A pack built before then, such as the owner's local one from 2026-11-09, no longer reads. A pack is derived data in the setup store and never ships, so only local stores are affected, but every executor's data tests report it as a known failure.

The owner, 2026-11-19: rebuild the local pack rather than read old ones, "but i do want the system to realize when that's out of date and ask for setup to be run again." The chief of staff rebuilt the owner's pack the same day.

## Done when

- Each derived dataset that setup builds (the sky pack first, then the others listed in `scripts/setup.mjs`: frames data, the design globe's tilesets, the WebAssembly builds, the STEP samples) records the format version it was built with, beside what it built.
- The code that reads a dataset knows the version it expects. When a dataset is older, or its manifest doesn't parse, it says so in one plain message that names the dataset and the command to run (`npm run setup`, or the narrower command such as `npm run sky`), instead of a parse error such as "modeled: expected a list of strings".
- The data tests and Dyno show that message too. A data test whose dataset is out of date is reported as "out of date: run setup", not as a failure of the change under test.
- The sky pack's builder writes `format: 2`. A format 1 pack, such as one built before 2026-11-15, is reported as out of date. No alias for old key names.
- A test pins each persisted format's key names, so a rename fails a test unless it bumps the format. A later spelling pass can't silently break a format again.
