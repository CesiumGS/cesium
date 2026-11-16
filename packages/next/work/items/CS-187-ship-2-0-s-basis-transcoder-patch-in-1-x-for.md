---
id: CS-187
title: Ship 2.0's Basis transcoder patch in 1.x for strict CSP
kind: external
state: planned
created: 2026-11-13
project: CS-19
waiting_on: CesiumJS 1.x
---

## Waiting on

1.x's bundled Basis transcoder needs `'unsafe-eval'` in its workers; PR #13669's guide asks applications to build their own with `-s DYNAMIC_EXECUTION=0`. 2.0 instead patches the four embind code generators in the same vendored glue at build time (closures, as Emscripten emits without dynamic execution; identical output on 72 transcodes), so a strict worker policy needs only `'wasm-unsafe-eval'`. 1.x could ship the same patch for 1.148.0 and make strict CSP work out of the box.

- **For:** CesiumJS 1.x
- **Where it is explained:** `docs/design/examples-and-the-gallery.md` (pages without a build)
- **Status (2026-11-13):** To bring to the team
- Formerly row 15 of the overall plan's follow-ups table.
