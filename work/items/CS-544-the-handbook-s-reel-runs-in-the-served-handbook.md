---
id: CS-544
title: The handbook's reel runs in the served handbook as well as the static file
kind: work
state: planned
created: 2026-11-15
project: CS-199
touches: [packages/next/handbook/vite.config.ts, packages/next/handbook/src/reel.tsx, packages/next/handbook/DESIGN.md]
---

Overview's "See it run" reel works only in the built single file (`npm run handbook`). The build's bundle step in `handbook/vite.config.ts` puts the reel's engine module and its data into the page as inert text (`live-engine`, `reel-index`, `reel-data`), and `src/reel.tsx` imports the module from a blob when a reader presses Start. The dev server (`npm run handbook:dev`, and `npm run handbook:serve` on 5199) never runs that step, so the served handbook has no reel. The owner asked for it to work in both (2026-11-15).

Keep what the static file guarantees: one file, no network, no token, the sky-pack and secret guards. The served version may get the same blocks from the dev server (for example, middleware serving the engine module and the reel data from the setup store), as long as `reel.tsx` takes one path to start the reel in both.

## Done when

- The reel starts and plays its five chapters in the built file opened from disk, and in the served handbook on its port.
- The built file is unchanged in what it holds: no network, no token, and the build's guards still refuse a sky pack or a secret.
- The served handbook says plainly when the setup store's reel data is missing (`node handbook/reel/fetchData.mjs`), as the build does.
- `handbook/DESIGN.md`'s "The reel" section describes both.
- The page passes the UI checks in `packages/next/AGENTS.md` ("UI and examples") in both versions, checked on a server of the executor's own, never the owner's 5199.
