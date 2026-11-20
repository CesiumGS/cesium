---
id: CS-734
title: A sealed, content-addressed layout for benchmark results, local first
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-733, CS-721]
touches: [packages/next/bench/suite/storage/**, packages/next/bench/suite/commands/storage.mjs, packages/next/bench/suite/cli.mjs, packages/next/bench/suite/data.ts, packages/next/bench/suite/images.mjs, packages/next/bench/suite/report.mjs, packages/next/test/bench*.test.ts]
---

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 8. Rough size: medium.

Model: the most capable one for design-heavy parts, a fast one for the rest.

## Done when

- New runs write records under `store/runs/<device id>/` and blobs by keyed hash (HMAC-SHA256 of the plaintext under a naming key), and Dyno reads the union with legacy files.
- Sealing round-trips, refuses a changed byte, a swapped name or a wrong key version, and checks a blob's HMAC (tested).
- Judgments (triage, annotations, labels, pins, approvals) are per-device events, and two devices' events on one alert fold to the newer one with its history (tested).
- With no remote configured, everything works as today.
