---
id: CS-837
title: Cesium IR's JSON format is experimental at cesium-ir/0.x until it graduates
kind: work
state: done
created: 2026-11-21
project: CS-10
needs: [CS-49]
claimed_by: orch-11-CS-837
touches: [packages/next/src/ir/**, packages/next/test]
---

The owner, 2026-11-21, answering CS-836 (merge CS-49): merge it, but as 0.x. CS-49 set Cesium IR's JSON format at `cesium-ir/1.0`, with versioning rules in `src/ir/FORMAT.md`. A minor version only adds fields, readers refuse other majors, and released schemas never change. The owner wants the format to stay free to change until it graduates, following CS-681's experimental tier.

Source: the owner's answer to CS-836. Why now: nothing outside the engine should write `cesium-ir/1.0` files before the format is meant to be stable. Rough size: small. Decider: the executor. Graduation to 1.0 comes back as an owner decision with an API review (CS-102). Filed: 2026-11-21.

## Done when

- `IR_VERSION` is `0.1` and the writer emits `cesium-ir/0.1`.
- `src/ir/FORMAT.md` says the format is experimental. Any 0.x release may change it. It graduates to 1.0 only through an API review, and then the existing versioning rules apply.
- A reader accepts files of its own 0.x version and refuses others, naming both versions. Tests cover both cases.
- All 358 test programs still round-trip exactly.
