---
id: CS-911
title: "The move's fix-ups after CS-611: an https lockfile entry, stale 1.x references, Sandcastle's dev data, notices, the lod suite"
kind: work
state: done
created: 2026-11-22
project: CS-609
claimed_by: orch-11-CS-911
---

> **Committed by the owner**, through their approval of the move's fix-ups on 2026-11-22: "the rest of the work to get 2.0 onto a clean tree that's part of that move". Source: CS-611's review and its executor's follow-ups (CS-910). Merges under the same bar as CS-611.

## Done when

- The lockfile resolves `human-in-the-lead` over `git+https`, or as a pinned tarball, with an integrity hash. Then `npm ci` needs no GitHub SSH key, on the other machine or in CS-613's CI.
- The README, the Lab's error text and the `dyno` skill stop advising a root `npm run build` or `CESIUM_BUILD_DIR`.
- The six Sandcastle `-dev` examples that load the deleted `Specs/Data` load from 2.0's tree or from the pin, or are removed with a note.
- A NOTICE sits beside `src/io/ThirdParty` and `widgets/assets`, matching the root `LICENSE.md`.
- The pinned-1.x test also catches `join()` paths and dynamic imports.
- Stale eslint, prettier, gitignore, editor and README references to 1.x's tree are gone.
- `parity/lod.ts` reads `tileset.state.policy`, and the lod suite passes. It failed the same way before and after CS-611, so it can't check CS-835 until this is fixed.
